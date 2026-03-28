import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  addProduitUniteVente,
  createProduit,
  deleteProduitUniteVente,
  getCategories,
  getFournisseurs,
  getProduit,
  updateProduit,
  updateProduitUniteVente,
} from '../lib/api';
import { getApiErrorMessage, isUpgradeRequiredError } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { useScanSuccessBeep } from '../lib/scanFeedback';
import { DARK_THEME, UNITES_BASE, COMMERCIAL_FLOWS, SUGGESTIONS_UNITES, FORM_TEXT } from './produit-form/constants';
import { buildInitialForm, toNumber, toOptionalNumber, toOptionalInt, toFieldValue, getCommercialFactor, formatQuantity, normalizeDateInput, parseDateInput, toDateInputValue, formatPickerDateValue, buildPickerDate, buildCalendarDays, buildClampedCalendarDate, formatDateLabel, prepareExpirationForSubmit, buildExpirationPreview, detectCommercialMode, buildFormFromProduit, buildUnitRowsFromProduit, isUnitRowBlank, prepareManualUnitsForSubmit, buildStockEquivalenceLines } from './produit-form/utils';

export default function ProduitFormScreen({ navigation, route }) {
  const { user } = useAuth();
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const playScanSuccessBeep = useScanSuccessBeep();
  const produitId = route.params?.produitId;
  const isEditing = Boolean(produitId);
  const [form, setForm] = useState(buildInitialForm(route.params?.codeBarre || ''));
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingProduit, setLoadingProduit] = useState(isEditing);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scanVisible, setScanVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanLocked, setScanLocked] = useState(false);
  const [unitesVente, setUnitesVente] = useState([]);
  const [removedUnitIds, setRemovedUnitIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [pickerType, setPickerType] = useState(null);
  const scrollRef = useRef(null);
  const fieldLayouts = useRef({});
  const activeFieldRef = useRef(null);
  const fieldRefs = useRef({});
  const scrollOffsetRef = useRef(0);

  const isAutomaticMode = Boolean(COMMERCIAL_FLOWS[form.commercialMode]);
  const text = FORM_TEXT[language] || FORM_TEXT.fr;
  const unitOptions = useMemo(() => UNITES_BASE.map((item) => ({ ...item, label: text.unitLabels[item.value] || item.label })), [text]);
  const commercialTexts = text.flowTexts;
  const commercialConfig = COMMERCIAL_FLOWS[form.commercialMode] || null;
  const quickSuggestions = useMemo(() => SUGGESTIONS_UNITES[form.uniteBase] || [], [form.uniteBase]);
  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(form.categorieId)),
    [categories, form.categorieId]
  );
  const selectedFournisseur = useMemo(
    () => fournisseurs.find((item) => String(item.id) === String(form.fournisseurId)),
    [fournisseurs, form.fournisseurId]
  );
  const commercialFactor = getCommercialFactor(form.commercialMode, form.commercialSize);
  const computedStockBase = isAutomaticMode ? commercialFactor * toNumber(form.commercialCount) : toNumber(form.stock);
  const preparedManualUnits = useMemo(() => prepareManualUnitsForSubmit(unitesVente), [unitesVente]);
  const manualUnitPreview = useMemo(() => preparedManualUnits.units, [preparedManualUnits.units]);
  const stockEquivalenceLines = useMemo(
    () => buildStockEquivalenceLines(computedStockBase, form.uniteBase, manualUnitPreview, locale),
    [computedStockBase, form.uniteBase, locale, manualUnitPreview]
  );
  const expirationPreview = useMemo(
    () => buildExpirationPreview(form.datePeremption, form.alertePeremptionJours, locale),
    [form.datePeremption, form.alertePeremptionJours, locale]
  );
  const expirationSummaryText = useMemo(() => {
    if (!expirationPreview) return text.noExpiration;
    if (expirationPreview.isExpired) {
      return text.expiredSince(expirationPreview.dateLabel, Math.abs(expirationPreview.daysRemaining));
    }
    if (expirationPreview.isSoon) {
      return text.expiresIn(expirationPreview.dateLabel, expirationPreview.daysRemaining);
    }
    return text.expiresOn(expirationPreview.dateLabel);
  }, [expirationPreview, text]);
  const expirationPickerDate = useMemo(() => buildPickerDate(form.datePeremption), [form.datePeremption]);
  const expirationDateLabel = useMemo(() => formatDateLabel(form.datePeremption, locale), [form.datePeremption, locale]);
  const expirationMonthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({
      value: index,
      label: new Date(2024, index, 1, 12, 0, 0, 0).toLocaleDateString(locale, { month: 'short' }),
    })),
    [locale]
  );
  const expirationDayOptions = useMemo(() => {
    const daysInMonth = new Date(expirationPickerDate.getFullYear(), expirationPickerDate.getMonth() + 1, 0, 12, 0, 0, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [expirationPickerDate]);
  const expirationYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const selectedYear = expirationPickerDate.getFullYear();
    const startYear = Math.min(currentYear - 2, selectedYear - 5);
    const endYear = Math.max(currentYear + 10, selectedYear + 5);
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  }, [expirationPickerDate]);
  const pickerOptions = (() => {
    if (pickerType === 'categorie') {
      return categories.map((item) => ({
        key: `category-${item.id}`,
        label: item.nom,
        isSelected: String(item.id) === String(form.categorieId),
        onPress: () => updateField('categorieId', String(item.id)),
      }));
    }

    if (pickerType === 'fournisseur') {
      return fournisseurs.map((item) => ({
        key: `supplier-${item.id}`,
        label: item.nom,
        isSelected: String(item.id) === String(form.fournisseurId),
        onPress: () => updateField('fournisseurId', String(item.id)),
      }));
    }

    if (pickerType === 'expirationDay') {
      return expirationDayOptions.map((day) => ({
        key: `day-${day}`,
        label: String(day).padStart(2, '0'),
        isSelected: day === expirationPickerDate.getDate(),
        onPress: () => selectExpirationDayValue(day),
      }));
    }

    if (pickerType === 'expirationMonth') {
      return expirationMonthOptions.map((item) => ({
        key: `month-${item.value}`,
        label: item.label,
        isSelected: item.value === expirationPickerDate.getMonth(),
        onPress: () => selectExpirationMonth(item.value),
      }));
    }

    if (pickerType === 'expirationYear') {
      return expirationYearOptions.map((year) => ({
        key: `year-${year}`,
        label: String(year),
        isSelected: year === expirationPickerDate.getFullYear(),
        onPress: () => selectExpirationYear(year),
      }));
    }

    return [];
  })();
  const marginSale = isAutomaticMode ? toNumber(form.prixVenteConditionnement) : toNumber(form.prixVente);
  const marginPurchase = isAutomaticMode ? toNumber(form.prixAchatConditionnement) : toNumber(form.prixAchat);
  const marginPercent = marginPurchase > 0 ? (((marginSale - marginPurchase) / marginPurchase) * 100).toFixed(1) : null;
  const selectedModeLabel = isAutomaticMode ? (commercialTexts[form.commercialMode]?.title || commercialConfig?.title) : text.manualEntry;
  const modeGuideText = isAutomaticMode ? text.automaticModeGuide(selectedModeLabel) : text.manualModeGuide;
  const saveHelperPrimaryText = isAutomaticMode
    ? text.saveHelperAutomatic(formatQuantity(computedStockBase, locale), commercialConfig?.uniteBase || form.uniteBase)
    : text.saveHelperManual;
  const saveHelperSecondaryText = isAutomaticMode ? text.saveHelperEdit : text.saveHelperManualUnits(manualUnitPreview.length);
  const placeholderTextColor = isDark ? themeColors.faint : '#9CA3AF';
  const accentColor = isDark ? themeColors.accentText : '#1B5E20';
  const neutralIconColor = isDark ? themeColors.faint : '#6B7280';

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? text.editTitle : text.createTitle,
      headerStyle: { backgroundColor: isDark ? themeColors.headerBg : '#071C08' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { color: '#FFFFFF', fontWeight: '800' },
    });
  }, [isDark, isEditing, navigation, text.createTitle, text.editTitle, themeColors]);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      const [categoriesResult, fournisseursResult] = await Promise.allSettled([
        getCategories(),
        getFournisseurs(),
      ]);

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value.data?.data || []);
      } else {
        setCategories([]);
      }

      if (fournisseursResult.status === 'fulfilled') {
        setFournisseurs(fournisseursResult.value.data?.data || []);
      } else {
        setFournisseurs([]);
      }

      setLoadingOptions(false);
    };

    loadOptions();
  }, []);

  useEffect(() => {
    if (route.params?.codeBarre) {
      setForm((prev) => ({ ...prev, codeBarre: route.params.codeBarre }));
    }
  }, [route.params?.codeBarre]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event) => {
      const nextKeyboardHeight = event?.endCoordinates?.height || 0;
      setKeyboardHeight(nextKeyboardHeight);

      if (activeFieldRef.current) {
        setTimeout(() => {
          scrollToField(activeFieldRef.current, nextKeyboardHeight);
        }, Platform.OS === 'ios' ? 40 : 80);
      }
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setLoadingProduit(false);
      return;
    }

    let mounted = true;

    const loadProduit = async () => {
      setLoadingProduit(true);
      try {
        const response = await getProduit(produitId);
        const produit = response.data?.data;
        if (mounted && produit) {
          setForm(buildFormFromProduit(produit));
          setUnitesVente(buildUnitRowsFromProduit(produit));
          setRemovedUnitIds([]);
        }
      } catch (error) {
        if (mounted) {
          Alert.alert(text.loadTitle, getApiErrorMessage(error, { language, fallback: text.loadError }), [
            { text: text.back, onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (mounted) setLoadingProduit(false);
      }
    };

    loadProduit();
    return () => { mounted = false; };
  }, [isEditing, navigation, produitId, text.back, text.loadError, text.loadTitle]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setCommercialMode = (mode) => {
    setForm((prev) => ({
      ...prev,
      commercialMode: mode,
      uniteBase: mode ? COMMERCIAL_FLOWS[mode].uniteBase : prev.uniteBase,
    }));
  };

  const addUnite = () => {
    setUnitesVente((prev) => ([
      ...prev,
      {
        nom: '',
        facteurConversion: '',
        prix: '',
        prixAchat: '',
        estDefaut: prev.length === 0 || !prev.some((unit) => unit.estDefaut),
        isNew: true,
      },
    ]));
  };

  const addSuggestion = (suggestion) => {
    const exists = unitesVente.some((unit) => String(unit.nom || '').trim().toLowerCase() === suggestion.nom.toLowerCase());
    if (exists) {
      Alert.alert(text.error, text.duplicateUnit(suggestion.nom));
      return;
    }

    setUnitesVente((prev) => ([
      ...prev,
      {
        nom: suggestion.nom,
        facteurConversion: String(suggestion.facteur),
        prix: '',
        prixAchat: '',
        estDefaut: prev.length === 0 || !prev.some((unit) => unit.estDefaut),
        isNew: true,
      },
    ]));
  };

  const updateUnite = (index, field, value) => {
    setUnitesVente((prev) => prev.map((unit, idx) => {
      if (idx !== index) {
        return field === 'estDefaut' && value ? { ...unit, estDefaut: false } : unit;
      }

      return { ...unit, [field]: value };
    }));
  };

  const removeUnite = (index) => {
    const target = unitesVente[index];
    if (target?.id) {
      setRemovedUnitIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
    }

    setUnitesVente((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (target?.estDefaut && next.length > 0 && !next.some((unit) => unit.estDefaut)) {
        next[0] = { ...next[0], estDefaut: true };
      }
      return next;
    });
  };

  const registerFieldLayout = (field) => (event) => {
    fieldLayouts.current[field] = event.nativeEvent.layout.y;
  };

  const registerFieldRef = (field) => (node) => {
    if (node) fieldRefs.current[field] = node;
  };

  const scrollToField = (field, forcedKeyboardHeight = keyboardHeight) => {
    const fieldNode = fieldRefs.current[field];

    const fallbackY = fieldLayouts.current[field];
    const fallbackScroll = () => {
      if (typeof fallbackY !== 'number') return;
      const keyboardBoost = Platform.OS === 'android'
        ? Math.min(Math.round((forcedKeyboardHeight || 0) * 0.9), 320)
        : 0;
      scrollRef.current?.scrollTo({ y: Math.max(fallbackY - 110 + keyboardBoost, 0), animated: true });
    };

    setTimeout(() => {
      if (!fieldNode?.measure || !scrollRef.current?.measure) {
        fallbackScroll();
        return;
      }

      scrollRef.current.measure((_sx, _sy, _sw, measuredScrollHeight, _spx, scrollPageY) => {
        fieldNode.measure((_fx, _fy, _fw, fieldHeight, _fpx, fieldPageY) => {
          const currentScrollY = scrollOffsetRef.current;
          const relativeTop = currentScrollY + (fieldPageY - scrollPageY);
          const extraLift = Platform.OS === 'android'
            ? Math.min(Math.round((forcedKeyboardHeight || 0) * 0.55), 220)
            : 40;
          const desiredY = Math.max(relativeTop - extraLift - 24, 0);

          const visibleHeight = Math.max(
            (scrollViewHeight || measuredScrollHeight || 0) - (forcedKeyboardHeight || 0) - 24,
            120
          );
          const visibleBottom = currentScrollY + visibleHeight;
          const fieldBottom = relativeTop + (fieldHeight || 56);

          if (fieldBottom > visibleBottom || desiredY !== currentScrollY) {
            scrollRef.current?.scrollTo({ y: desiredY, animated: true });
            return;
          }

          fallbackScroll();
        });
      });
    }, forcedKeyboardHeight ? 40 : 140);
  };

  const handleFieldFocus = (field) => {
    activeFieldRef.current = field;
    scrollToField(field);
  };

  const clearExpirationDate = () => {
    updateField('datePeremption', '');
  };

  const setExpirationDateParts = (year, month, day) => {
    const value = buildClampedCalendarDate(year, month, day);
    updateField('datePeremption', formatPickerDateValue(value));
  };

  const openExpirationPartPicker = (type) => {
    handleFieldFocus('datePeremption');
    setPickerType(type);
  };

  const selectExpirationMonth = (month) => {
    setExpirationDateParts(expirationPickerDate.getFullYear(), month, expirationPickerDate.getDate());
  };

  const selectExpirationYear = (year) => {
    setExpirationDateParts(year, expirationPickerDate.getMonth(), expirationPickerDate.getDate());
  };

  const selectExpirationDayValue = (day) => {
    setExpirationDateParts(expirationPickerDate.getFullYear(), expirationPickerDate.getMonth(), day);
  };

  const openScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(text.cameraPermissionTitle, text.cameraPermissionText);
      return;
    }
    setScanLocked(false);
    setScanVisible(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanLocked) return;
    setScanLocked(true);
    playScanSuccessBeep();
    updateField('codeBarre', data);
    setScanVisible(false);
    setScanLocked(false);
  };

  const handleSubmit = async () => {
    if (user?.role !== 'ADMIN') {
      Alert.alert(text.accessDenied, text.adminOnly(isEditing));
      return;
    }

    if (!form.nom.trim()) {
      Alert.alert(text.requiredField, text.requiredName);
      return;
    }

    if (!form.codeBarre.trim()) {
      Alert.alert(text.requiredField, text.requiredBarcode);
      return;
    }

    if (isAutomaticMode && !form.commercialSize) {
      Alert.alert(text.requiredField, text.requiredSize);
      return;
    }

    if (!isAutomaticMode && preparedManualUnits.hasIncompleteRow) {
      Alert.alert(text.requiredField, text.incompleteUnit);
      return;
    }

    const expirationPayload = prepareExpirationForSubmit(form);
    if (expirationPayload.error === 'DATE_REQUIRED') {
      Alert.alert(text.requiredField, text.expirationDateRequired);
      return;
    }

    if (expirationPayload.error === 'INVALID_DATE') {
      Alert.alert(text.requiredField, text.expirationInvalid);
      return;
    }

    if (expirationPayload.error === 'INVALID_ALERT_DAYS') {
      Alert.alert(text.requiredField, text.expirationAlertInvalid);
      return;
    }

    if (isAutomaticMode) {
      if (form.prixVenteConditionnement === '') {
        Alert.alert(text.requiredField, text.requiredPackSale);
        return;
      }

      if (form.prixAchatConditionnement === '') {
        Alert.alert(text.requiredField, text.requiredPackPurchase);
        return;
      }
    } else {
      if (form.prixVente === '') {
        Alert.alert(text.requiredField, text.requiredSale);
        return;
      }

      if (!isEditing && form.stock === '') {
        Alert.alert(text.requiredField, text.requiredStock);
        return;
      }
    }

    if (!form.categorieId) {
      Alert.alert(text.requiredField, text.requiredCategory);
      return;
    }

    setSaving(true);

    try {
      const payload = isAutomaticMode
        ? {
            nom: form.nom.trim(),
            description: form.description.trim() || undefined,
            codeBarre: form.codeBarre.trim(),
            categorieId: toOptionalInt(form.categorieId),
            fournisseurId: toOptionalInt(form.fournisseurId),
            commercialMode: form.commercialMode,
            commercialSize: toNumber(form.commercialSize),
            commercialCount: toNumber(form.commercialCount),
            stockAlerte: toNumber(form.stockAlerte),
            prixAchatConditionnement: toNumber(form.prixAchatConditionnement),
            prixVenteConditionnement: toNumber(form.prixVenteConditionnement),
            prixVenteDetail: form.commercialMode === 'carton' ? toOptionalNumber(form.prixVenteDetail) : undefined,
            ...expirationPayload,
          }
        : {
            nom: form.nom.trim(),
            description: form.description.trim() || undefined,
            codeBarre: form.codeBarre.trim(),
            prixVente: toNumber(form.prixVente),
            prixAchat: toNumber(form.prixAchat),
            stock: toNumber(form.stock),
            stockAlerte: toNumber(form.stockAlerte),
            uniteBase: form.uniteBase || 'piece',
            categorieId: toOptionalInt(form.categorieId),
            fournisseurId: toOptionalInt(form.fournisseurId),
            ...expirationPayload,
            unitesVente: isEditing ? undefined : preparedManualUnits.units.map((unit) => ({
              nom: unit.nom,
              facteurConversion: unit.facteurConversion,
              prix: unit.prix,
              prixAchat: unit.prixAchat,
              estDefaut: unit.estDefaut,
            })),
          };

      const res = isEditing ? await updateProduit(produitId, payload) : await createProduit(payload);

      if (isEditing && !isAutomaticMode) {
        for (const uniteId of removedUnitIds) {
          await deleteProduitUniteVente(uniteId);
        }

        for (const unit of preparedManualUnits.units.filter((item) => item.isNew)) {
          await addProduitUniteVente(produitId, {
            nom: unit.nom,
            facteurConversion: unit.facteurConversion,
            prix: unit.prix,
            prixAchat: unit.prixAchat,
            estDefaut: unit.estDefaut,
          });
        }

        for (const unit of preparedManualUnits.units.filter((item) => !item.isNew && item.id)) {
          await updateProduitUniteVente(unit.id, {
            nom: unit.nom,
            facteurConversion: unit.facteurConversion,
            prix: unit.prix,
            prixAchat: unit.prixAchat,
            estDefaut: unit.estDefaut,
          });
        }
      }

      Alert.alert(
        isEditing ? text.updatedTitle : text.createdTitle,
        getApiSuccessMessage(res, {
          language,
          fallback: getLocalSuccessMessage({
            language,
            entity: 'produit',
            action: isEditing ? 'update' : 'create',
          }),
        }),
        isEditing
          ? [{ text: text.backToStock, onPress: () => navigation.goBack() }]
          : [
              {
                text: text.createAnother,
                onPress: () => {
                  setForm(buildInitialForm(''));
                  setUnitesVente([]);
                  setRemovedUnitIds([]);
                },
              },
              { text: text.viewStock, onPress: () => navigation.navigate('Stock') },
            ]
      );
    } catch (err) {
      const message = getApiErrorMessage(err, { language, fallback: text.saveError(isEditing) });
      if (isUpgradeRequiredError(err)) {
        Alert.alert(text.error, message, [
          { text: text.close, style: 'cancel' },
          { text: text.viewPlans, onPress: () => navigation.navigate('Abonnement') },
        ]);
      } else {
        Alert.alert(text.error, message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Non-admins: show read-only product detail if editing, else block creation
  if (user?.role !== 'ADMIN') {
    if (!isEditing) {
      return (
        <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
          <Text style={[styles.lockTitle, isDark && { color: themeColors.text }]}>{text.adminRequiredTitle}</Text>
          <Text style={[styles.lockText, isDark && { color: themeColors.muted }]}>{text.adminRequiredText}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <View style={styles.primaryBtnRow}>
              <Feather name="arrow-left" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{text.back}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (loadingProduit) {
      return <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}><ActivityIndicator size="large" color="#1B5E20" /></View>;
    }

    // Read-only product detail view for non-admins
    const TC = { terracotta: '#1B5E20', green: '#1B5E20', gold: '#FFD600' };
    const bg = isDark ? themeColors.background : '#F8F6F3';
    const cardBg = isDark ? themeColors.cardBg : '#FFFFFF';
    const cardBorder = isDark ? themeColors.cardBorder : '#EDE8E3';
    const textColor = isDark ? themeColors.text : '#1A1A18';
    const mutedColor = isDark ? themeColors.muted : '#6B7280';

    const InfoRow = ({ icon, label, value, valueColor }) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? 'rgba(27,94,32,0.15)' : 'rgba(27,94,32,0.10)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Feather name={icon} size={16} color={TC.terracotta} />
        </View>
        <Text style={{ flex: 1, fontSize: 13, color: mutedColor }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: valueColor || textColor, maxWidth: 180, textAlign: 'right' }}>{value || '—'}</Text>
      </View>
    );

    const stockBadgeColor = Number(form.stock) <= 0 ? '#DC2626' : Number(form.stock) <= Number(form.stockAlerte) ? '#D4880F' : TC.green;
    const stockBg = Number(form.stock) <= 0 ? '#FEE2E2' : Number(form.stock) <= Number(form.stockAlerte) ? '#FFF6E5' : '#E8F5ED';

    return (
      <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={{ backgroundColor: isDark ? themeColors.headerBg : '#071C08', paddingTop: 52, paddingBottom: 28, paddingHorizontal: 20 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Feather name="package" size={26} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }} numberOfLines={2}>{form.nom || '—'}</Text>
          {form.codeBarre ? (
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{form.codeBarre}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: stockBg }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: stockBadgeColor }}>Stock : {form.stock || '0'}</Text>
            </View>
            {isAutomaticMode && commercialConfig ? (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>{commercialTexts[form.commercialMode]?.title || commercialConfig.title}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Info card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: cardBorder }}>
          <InfoRow icon="tag" label={text.category} value={selectedCategory?.nom || form.categorieId} />
          <InfoRow icon="truck" label={text.supplier} value={selectedFournisseur?.nom || form.fournisseurId} />
          <InfoRow icon="dollar-sign" label={text.salePrice} value={(form.prixVente || form.prixVenteConditionnement) ? `${form.prixVente || form.prixVenteConditionnement} FCFA` : null} valueColor={TC.green} />
          <InfoRow icon="shopping-bag" label={text.purchasePrice} value={(form.prixAchat || form.prixAchatConditionnement) ? `${form.prixAchat || form.prixAchatConditionnement} FCFA` : null} />
          <InfoRow icon="alert-triangle" label={text.alertStock} value={form.stockAlerte || '0'} />
          {form.datePeremption ? (
            <InfoRow icon="calendar" label={text.expirationSummary} value={expirationSummaryText} />
          ) : null}
          {form.description ? (
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 13, color: mutedColor, marginBottom: 4 }}>{text.description}</Text>
              <Text style={{ fontSize: 14, color: textColor }}>{form.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Sales units */}
        {unitesVente.length > 0 ? (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: cardBorder }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: textColor, marginBottom: 10 }}>{text.saleUnitsTitle}</Text>
            {unitesVente.map((unit, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < unitesVente.length - 1 ? 1 : 0, borderBottomColor: cardBorder }}>
                <Text style={{ fontSize: 14, color: textColor, fontWeight: unit.estDefaut ? '800' : '500' }}>{unit.nom}{unit.estDefaut ? ' ★' : ''}</Text>
                <Text style={{ fontSize: 14, color: TC.green, fontWeight: '700' }}>{unit.prix ? `${unit.prix} FCFA` : '—'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Back button */}
        <TouchableOpacity
          style={{ marginHorizontal: 16, marginTop: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: TC.terracotta, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Feather name="arrow-left" size={17} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{text.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (loadingProduit) {
    return <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}><ActivityIndicator size="large" color="#1B5E20" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 24}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 140 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onLayout={(event) => setScrollViewHeight(event.nativeEvent.layout.height)}
        onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View style={[styles.section, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}><Feather name="package" size={18} color={accentColor} /></View>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.productInfoTitle}</Text>
              <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{isEditing ? text.productInfoSubtitleEdit : text.productInfoSubtitleCreate}</Text>
            </View>
          </View>

          <View ref={registerFieldRef('nom')} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout('nom')}>
            <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.productName}</Text>
            <TextInput style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]} value={form.nom} onChangeText={(v) => updateField('nom', v)} placeholder={text.productNamePlaceholder} placeholderTextColor={placeholderTextColor} onFocus={() => handleFieldFocus('nom')} />
          </View>

          <View ref={registerFieldRef('codeBarre')} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout('codeBarre')}>
            <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.barcode}</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, styles.inlineInput, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.codeBarre}
                onChangeText={(v) => updateField('codeBarre', v)}
                placeholder={text.barcodePlaceholder}
                placeholderTextColor={placeholderTextColor}
                autoCapitalize="none"
                onFocus={() => handleFieldFocus('codeBarre')}
              />
              <TouchableOpacity style={[styles.scanBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={openScanner}>
                <Feather name="camera" size={16} color={accentColor} />
                <Text style={[styles.scanBtnText, isDark && { color: themeColors.accentText }]}>{text.scan}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldWrap, styles.halfField]}>
              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.category}</Text>
              <TouchableOpacity style={[styles.selectBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => setPickerType('categorie')}>
                <Text numberOfLines={1} style={[styles.selectBtnText, !selectedCategory && styles.placeholderText, isDark && { color: themeColors.text }, !selectedCategory && isDark && { color: themeColors.faint }]}>{selectedCategory?.nom || text.chooseCategory}</Text>
                <Feather name="chevron-down" size={16} color={neutralIconColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldWrap, styles.halfField]}>
              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.supplier}</Text>
              <TouchableOpacity
                style={[styles.selectBtn, fournisseurs.length === 0 && styles.selectBtnDisabled, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                onPress={() => fournisseurs.length > 0 && setPickerType('fournisseur')}
                disabled={fournisseurs.length === 0}
              >
                <Text numberOfLines={1} style={[styles.selectBtnText, !selectedFournisseur && styles.placeholderText, isDark && { color: themeColors.text }, !selectedFournisseur && isDark && { color: themeColors.faint }]}> 
                  {selectedFournisseur?.nom || (loadingOptions ? text.loading : fournisseurs.length > 0 ? text.chooseSupplier : text.noSupplier)}
                </Text>
                <Feather name="chevron-down" size={16} color={neutralIconColor} />
              </TouchableOpacity>
            </View>
          </View>

          <View ref={registerFieldRef('description')} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout('description')}>
            <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.description}</Text>
            <TextInput
              style={[styles.input, styles.textarea, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
              value={form.description}
              onChangeText={(v) => updateField('description', v)}
              placeholder={text.descriptionPlaceholder}
              placeholderTextColor={placeholderTextColor}
              multiline
              textAlignVertical="top"
              onFocus={() => handleFieldFocus('description')}
            />
          </View>
        </View>

        <View style={[styles.section, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}><Feather name="calendar" size={18} color={accentColor} /></View>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.expirationTitle}</Text>
              <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.expirationSubtitle}</Text>
            </View>
          </View>

          <View ref={registerFieldRef('datePeremption')} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout('datePeremption')}>
            <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.expirationDate}</Text>
            <View style={styles.datePartsRow}>
              <TouchableOpacity style={[styles.datePartBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => openExpirationPartPicker('expirationDay')} activeOpacity={0.85}>
                <Text style={[styles.datePartBtnText, !form.datePeremption && styles.placeholderText, isDark && { color: themeColors.text }, !form.datePeremption && isDark && { color: themeColors.faint }]}>
                  {form.datePeremption ? String(expirationPickerDate.getDate()).padStart(2, '0') : text.expirationDayLabel}
                </Text>
                <Feather name="chevron-down" size={16} color={neutralIconColor} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.datePartBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => openExpirationPartPicker('expirationMonth')} activeOpacity={0.85}>
                <Text style={[styles.datePartBtnText, !form.datePeremption && styles.placeholderText, isDark && { color: themeColors.text }, !form.datePeremption && isDark && { color: themeColors.faint }]} numberOfLines={1}>
                  {form.datePeremption ? expirationMonthOptions[expirationPickerDate.getMonth()]?.label : text.expirationMonthFieldLabel}
                </Text>
                <Feather name="chevron-down" size={16} color={neutralIconColor} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.datePartBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => openExpirationPartPicker('expirationYear')} activeOpacity={0.85}>
                <Text style={[styles.datePartBtnText, !form.datePeremption && styles.placeholderText, isDark && { color: themeColors.text }, !form.datePeremption && isDark && { color: themeColors.faint }]}>
                  {form.datePeremption ? expirationPickerDate.getFullYear() : text.expirationYearLabel}
                </Text>
                <Feather name="chevron-down" size={16} color={neutralIconColor} />
              </TouchableOpacity>

              {form.datePeremption ? (
                <TouchableOpacity style={[styles.iconActionBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={clearExpirationDate}>
                  <Feather name="x" size={16} color={neutralIconColor} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.helperText, styles.dateInlineValue, isDark && { color: themeColors.muted }]}>{expirationDateLabel || text.expirationDatePlaceholder}</Text>
          </View>

          <View ref={registerFieldRef('alertePeremptionJours')} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout('alertePeremptionJours')}>
            <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.expirationAlertDays}</Text>
            <TextInput
              style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
              value={form.alertePeremptionJours}
              onChangeText={(value) => updateField('alertePeremptionJours', value.replace(/[^0-9]/g, ''))}
              placeholder={text.expirationAlertDaysPlaceholder}
              placeholderTextColor={placeholderTextColor}
              onFocus={() => handleFieldFocus('alertePeremptionJours')}
              keyboardType="number-pad"
            />
          </View>

          <Text style={[styles.helperText, isDark && { color: themeColors.muted }]}>{text.expirationHint}</Text>

          {expirationPreview ? (
            <View
              style={[
                styles.expirationPreviewCard,
                expirationPreview.isExpired
                  ? styles.expirationPreviewDanger
                  : (expirationPreview.isSoon ? styles.expirationPreviewWarning : styles.expirationPreviewInfo),
                isDark && expirationPreview.isExpired && { backgroundColor: themeColors.dangerBg, borderColor: themeColors.dangerBorder },
                isDark && expirationPreview.isSoon && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder },
                isDark && !expirationPreview.isExpired && !expirationPreview.isSoon && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder },
              ]}
            >
              <Feather
                name={expirationPreview.isExpired ? 'alert-octagon' : (expirationPreview.isSoon ? 'alert-triangle' : 'calendar')}
                size={16}
                color={expirationPreview.isExpired ? '#b91c1c' : (expirationPreview.isSoon ? '#b45309' : '#1B6B3A')}
              />
              <Text
                style={[
                  styles.expirationPreviewText,
                  expirationPreview.isExpired
                    ? styles.expirationPreviewDangerText
                    : (expirationPreview.isSoon ? styles.expirationPreviewWarningText : styles.expirationPreviewInfoText),
                ]}
              >
                {expirationSummaryText}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}><Feather name="layers" size={18} color={accentColor} /></View>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.stockTypeTitle}</Text>
              <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.stockTypeSubtitle}</Text>
            </View>
          </View>

          <View style={styles.modeGrid}>
            {Object.entries(COMMERCIAL_FLOWS).map(([mode]) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, form.commercialMode === mode && styles.modeCardActive, isDark && form.commercialMode === mode && { backgroundColor: 'rgba(27,94,32,0.25)', borderColor: '#FFD600' }]}
                onPress={() => setCommercialMode(mode)}
              >
                <Text numberOfLines={2} style={[styles.modeCardTitle, isDark && { color: themeColors.text }, form.commercialMode === mode && styles.modeCardTitleActive, isDark && form.commercialMode === mode && { color: '#FFD600' }]}>{commercialTexts[mode]?.title || COMMERCIAL_FLOWS[mode].title}</Text>
                <Text style={[styles.modeCardText, isDark && { color: themeColors.muted }, form.commercialMode === mode && styles.modeCardTextActive, isDark && form.commercialMode === mode && { color: '#FFD600' }]}>{commercialTexts[mode]?.description || COMMERCIAL_FLOWS[mode].description}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modeCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, !isAutomaticMode && styles.modeCardActive, isDark && !isAutomaticMode && { backgroundColor: 'rgba(27,94,32,0.25)', borderColor: '#FFD600' }]}
              onPress={() => setCommercialMode('')}
            >
              <Text numberOfLines={2} style={[styles.modeCardTitle, isDark && { color: themeColors.text }, !isAutomaticMode && styles.modeCardTitleActive, isDark && !isAutomaticMode && { color: '#FFD600' }]}>{text.manualEntry}</Text>
              <Text style={[styles.modeCardText, isDark && { color: themeColors.muted }, !isAutomaticMode && styles.modeCardTextActive, isDark && !isAutomaticMode && { color: '#FFD600' }]}>{text.manualEntryDesc}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder }]}>
            <Feather name="info" size={16} color={accentColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, isDark && { color: themeColors.accentText }]}>{text.modeGuideTitle}</Text>
              <Text style={[styles.infoText, isDark && { color: themeColors.muted }]}>{modeGuideText}</Text>
            </View>
          </View>

          {isAutomaticMode ? (
            <>
              <View style={[styles.infoBox, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder }]}>
                <Feather name="info" size={16} color={accentColor} />
                <Text style={[styles.infoText, isDark && { color: themeColors.muted }]}>{text.automaticInfo}</Text>
              </View>

              <View style={styles.row}>
                <View ref={registerFieldRef('commercialSize')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('commercialSize')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{commercialTexts[form.commercialMode]?.sizeLabel || commercialConfig.sizeLabel}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.commercialSize}
                    onChangeText={(v) => updateField('commercialSize', v)}
                    keyboardType="decimal-pad"
                    placeholder={commercialConfig.sizePlaceholder}
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('commercialSize')}
                  />
                </View>
                <View ref={registerFieldRef('commercialCount')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('commercialCount')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{commercialTexts[form.commercialMode]?.countLabel || commercialConfig.countLabel}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.commercialCount}
                    onChangeText={(v) => updateField('commercialCount', v)}
                    keyboardType="decimal-pad"
                    placeholder={commercialConfig.countPlaceholder}
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('commercialCount')}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View ref={registerFieldRef('prixVenteConditionnement')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('prixVenteConditionnement')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{commercialTexts[form.commercialMode]?.saleLabel || commercialConfig.saleLabel} (FCFA)</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.prixVenteConditionnement}
                    onChangeText={(v) => updateField('prixVenteConditionnement', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('prixVenteConditionnement')}
                  />
                </View>
                <View ref={registerFieldRef('prixAchatConditionnement')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('prixAchatConditionnement')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{commercialTexts[form.commercialMode]?.purchaseLabel || commercialConfig.purchaseLabel} (FCFA)</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.prixAchatConditionnement}
                    onChangeText={(v) => updateField('prixAchatConditionnement', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('prixAchatConditionnement')}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View ref={registerFieldRef('stockAlerte')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('stockAlerte')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{commercialTexts[form.commercialMode]?.alertLabel || commercialConfig.alertLabel}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.stockAlerte}
                    onChangeText={(v) => updateField('stockAlerte', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('stockAlerte')}
                  />
                </View>
                {form.commercialMode === 'carton' ? (
                  <View ref={registerFieldRef('prixVenteDetail')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('prixVenteDetail')}>
                    <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.detailUnitPrice}</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                      value={form.prixVenteDetail}
                      onChangeText={(v) => updateField('prixVenteDetail', v)}
                      keyboardType="decimal-pad"
                      placeholder={text.autoIfEmpty}
                      placeholderTextColor={placeholderTextColor}
                      onFocus={() => handleFieldFocus('prixVenteDetail')}
                    />
                  </View>
                ) : <View style={styles.halfField} />}
              </View>

              <View style={[styles.previewCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <Text style={[styles.previewTitle, isDark && { color: themeColors.text }]}>{text.autoPreview}</Text>
                <Text style={[styles.previewLine, isDark && { color: themeColors.muted }]}>{text.internalBase} : {commercialConfig.uniteBase}</Text>
                <Text style={[styles.previewLine, isDark && { color: themeColors.muted }]}>{text.computedStock} : {formatQuantity(computedStockBase, locale)} {commercialConfig.uniteBase}</Text>
                <Text style={[styles.previewLine, isDark && { color: themeColors.muted }]}>{text.detailUnits} : {commercialConfig.detailUnits.join(' • ')}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View ref={registerFieldRef('prixVente')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('prixVente')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.salePrice}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.prixVente}
                    onChangeText={(v) => updateField('prixVente', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('prixVente')}
                  />
                </View>

                <View ref={registerFieldRef('prixAchat')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('prixAchat')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.purchasePrice}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.prixAchat}
                    onChangeText={(v) => updateField('prixAchat', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('prixAchat')}
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.baseUnit}</Text>
                <View style={styles.unitsRow}>
                  {unitOptions.map((unite) => (
                    <TouchableOpacity
                      key={unite.value}
                      style={[styles.unitChip, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, form.uniteBase === unite.value && styles.unitChipActive, isDark && form.uniteBase === unite.value && { backgroundColor: '#1B5E20', borderColor: '#1B5E20' }]}
                      onPress={() => updateField('uniteBase', unite.value)}
                    >
                      <Text style={[styles.unitChipText, isDark && { color: themeColors.muted }, form.uniteBase === unite.value && styles.unitChipTextActive]}>{unite.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={[styles.helperText, isDark && { color: themeColors.muted }]}>{text.saleUnitsInfo(form.uniteBase)}</Text>

              <View style={styles.row}>
                <View ref={registerFieldRef('stock')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('stock')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.initialStock}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.stock}
                    onChangeText={(v) => updateField('stock', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('stock')}
                  />
                </View>

                <View ref={registerFieldRef('stockAlerteManual')} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout('stockAlerteManual')}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.alertStock}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                    value={form.stockAlerte}
                    onChangeText={(v) => updateField('stockAlerte', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus('stockAlerteManual')}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {!isAutomaticMode ? (
          <View style={[styles.section, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, isDark && { backgroundColor: 'rgba(27,107,58,0.2)' }]}><Feather name="grid" size={18} color={isDark ? '#7FD4A4' : '#1B6B3A'} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.saleUnitsTitle}</Text>
                <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.saleUnitsSubtitle}</Text>
              </View>
            </View>

            <View style={[styles.infoBox, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder }]}>
              <Feather name="info" size={16} color={accentColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, isDark && { color: themeColors.accentText }]}>{text.saleUnitsInfoTitle}</Text>
                <Text style={[styles.infoText, isDark && { color: themeColors.muted }]}>{text.saleUnitsInfo(form.uniteBase)}</Text>
              </View>
            </View>

            {quickSuggestions.length > 0 ? (
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.quickSuggestions}</Text>
                <View style={styles.unitsRow}>
                  {quickSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={`${form.uniteBase}-${suggestion.nom}`}
                      style={[styles.suggestionChip, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                      onPress={() => addSuggestion(suggestion)}
                    >
                      <Feather name="plus" size={12} color={accentColor} />
                      <Text style={[styles.suggestionChipText, isDark && { color: themeColors.accentText }]}>{suggestion.nom} ({formatQuantity(suggestion.facteur, locale)} {form.uniteBase})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {unitesVente.length === 0 ? (
              <View style={[styles.emptyState, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <Feather name="package" size={24} color={isDark ? themeColors.faint : '#94a3b8'} />
                <Text style={[styles.emptyStateTitle, isDark && { color: themeColors.text }]}>{text.noUnitsTitle}</Text>
                <Text style={[styles.emptyStateText, isDark && { color: themeColors.muted }]}>{text.noUnitsText}</Text>
              </View>
            ) : null}

            {unitesVente.map((unit, index) => (
              <View key={unit.id || `new-${index}`} style={[styles.unitCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <View style={styles.unitCardHeader}>
                  <Text numberOfLines={2} style={[styles.unitCardTitle, isDark && { color: themeColors.text }]}>{unit.nom?.trim() || `${text.unitName} ${index + 1}`}</Text>
                  <TouchableOpacity style={[styles.unitRemoveBtn, isDark && { backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' }]} onPress={() => removeUnite(index)}>
                    <Feather name="trash-2" size={14} color="#dc2626" />
                    <Text numberOfLines={1} style={styles.unitRemoveBtnText}>{text.removeUnit}</Text>
                  </TouchableOpacity>
                </View>

                <View ref={registerFieldRef(`unite-nom-${index}`)} collapsable={false} style={styles.fieldWrap} onLayout={registerFieldLayout(`unite-nom-${index}`)}>
                  <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.unitName}</Text>
                  <TextInput
                    style={[styles.input, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                    value={unit.nom}
                    onChangeText={(value) => updateUnite(index, 'nom', value)}
                    placeholder={text.unitNamePlaceholder}
                    placeholderTextColor={placeholderTextColor}
                    onFocus={() => handleFieldFocus(`unite-nom-${index}`)}
                  />
                </View>

                <View style={styles.row}>
                  <View ref={registerFieldRef(`unite-factor-${index}`)} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout(`unite-factor-${index}`)}>
                    <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.conversionFactor}</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                      value={unit.facteurConversion}
                      onChangeText={(value) => updateUnite(index, 'facteurConversion', value)}
                      keyboardType="decimal-pad"
                      placeholder={text.conversionFactorPlaceholder}
                      placeholderTextColor={placeholderTextColor}
                      onFocus={() => handleFieldFocus(`unite-factor-${index}`)}
                    />
                  </View>

                  <View ref={registerFieldRef(`unite-price-${index}`)} collapsable={false} style={[styles.fieldWrap, styles.halfField]} onLayout={registerFieldLayout(`unite-price-${index}`)}>
                    <Text style={[styles.label, isDark && { color: themeColors.text }]}>{text.unitSalePrice}</Text>
                    <TextInput
                      style={[styles.input, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, color: themeColors.text }]}
                      value={unit.prix}
                      onChangeText={(value) => updateUnite(index, 'prix', value)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={placeholderTextColor}
                      onFocus={() => handleFieldFocus(`unite-price-${index}`)}
                    />
                  </View>
                </View>

                {unit.facteurConversion ? (
                  <Text style={[styles.unitHint, isDark && { color: themeColors.muted }]}>1 {unit.nom || '...'} = {formatQuantity(unit.facteurConversion, locale, 4)} {form.uniteBase}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.defaultBtn, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }, unit.estDefaut && styles.defaultBtnActive, isDark && unit.estDefaut && { backgroundColor: 'rgba(27,94,32,0.25)', borderColor: '#FFD600' }]}
                  onPress={() => updateUnite(index, 'estDefaut', true)}
                >
                  <Feather name={unit.estDefaut ? 'check-circle' : 'circle'} size={15} color={unit.estDefaut ? accentColor : neutralIconColor} />
                  <Text style={[styles.defaultBtnText, isDark && { color: themeColors.muted }, unit.estDefaut && styles.defaultBtnTextActive, isDark && unit.estDefaut && { color: '#FFD600' }]}>{unit.estDefaut ? text.defaultUnit : text.setDefault}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[styles.secondaryBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={addUnite}>
              <Feather name="plus" size={16} color={accentColor} />
              <Text style={[styles.secondaryBtnText, isDark && { color: themeColors.accentText }]}>{text.addUnit}</Text>
            </TouchableOpacity>

            {stockEquivalenceLines.length > 0 ? (
              <View style={[styles.previewCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <Text style={[styles.previewTitle, isDark && { color: themeColors.text }]}>{text.stockEquivalences}</Text>
                {stockEquivalenceLines.map((line) => (
                  <Text key={line} style={[styles.previewLine, isDark && { color: themeColors.muted }]}>• {line}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.section, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}><Feather name="dollar-sign" size={18} color={accentColor} /></View>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.summaryTitle}</Text>
              <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.summarySubtitle}</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.muted }]}>{text.mode}</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{selectedModeLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.muted }]}>{text.stockSaved}</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{formatQuantity(computedStockBase, locale)} {isAutomaticMode ? commercialConfig.uniteBase : form.uniteBase}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.muted }]}>{text.category}</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{selectedCategory?.nom || text.undefinedCategory}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.muted }]}>{text.supplier}</Text>
              <Text style={[styles.summaryValue, isDark && { color: themeColors.text }]}>{selectedFournisseur?.nom || text.undefinedSupplier}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDark && { color: themeColors.muted }]}>{text.expirationSummary}</Text>
              <Text
                style={[
                  styles.summaryValue,
                  isDark && { color: themeColors.text },
                  expirationPreview?.isExpired
                    ? styles.summaryValueDanger
                    : (expirationPreview?.isSoon ? styles.summaryValueWarning : null),
                ]}
              >
                {expirationSummaryText}
              </Text>
            </View>
            {!isAutomaticMode ? (
              <View style={[styles.summaryUnitsBlock, isDark && { borderTopColor: themeColors.surfaceBorder }]}>
                <View style={styles.summaryUnitsHeader}>
                  <Text style={[styles.summaryUnitsTitle, isDark && { color: themeColors.text }]}>{text.saleUnitsSummary}</Text>
                  <Text style={[styles.summaryUnitsCount, isDark && { color: themeColors.muted }]}>{text.configuredUnits(manualUnitPreview.length)}</Text>
                </View>

                {manualUnitPreview.length > 0 ? (
                  manualUnitPreview.map((unit) => (
                    <View key={`summary-unit-${unit.id || unit.nom}`} style={[styles.summaryUnitCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
                      <View style={styles.summaryUnitTop}>
                        <Text style={[styles.summaryUnitName, isDark && { color: themeColors.text }]}>{unit.nom}</Text>
                        <Text style={styles.summaryUnitPrice}>{text.unitPriceLabel}: {formatQuantity(unit.prix, locale)} FCFA</Text>
                      </View>
                      <Text style={[styles.summaryUnitMeta, isDark && { color: themeColors.muted }]}>1 {unit.nom} = {formatQuantity(unit.facteurConversion, locale, 4)} {form.uniteBase}</Text>
                      {unit.estDefaut ? <Text style={[styles.summaryUnitDefault, isDark && { backgroundColor: themeColors.accentBg, color: themeColors.accentText }]}>{text.defaultUnit}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.summaryUnitEmpty, isDark && { color: themeColors.muted }]}>{text.noUnitsText}</Text>
                )}

                {stockEquivalenceLines.length > 0 ? (
                  <View style={[styles.summaryUnitEquivalences, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
                    <Text style={[styles.summaryUnitEquivalencesTitle, isDark && { color: themeColors.text }]}>{text.stockEquivalences}</Text>
                    {stockEquivalenceLines.map((line) => (
                      <Text key={`summary-${line}`} style={[styles.summaryUnitEquivalenceLine, isDark && { color: themeColors.muted }]}>• {line}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            {marginPercent !== null && !Number.isNaN(Number(marginPercent)) ? (
              <TouchableOpacity
                style={[styles.marginBadge, Number(marginPercent) >= 0 ? styles.marginPositive : styles.marginNegative]}
                activeOpacity={1}
              >
                <Feather name="trending-up" size={14} color={Number(marginPercent) >= 0 ? '#047857' : '#b91c1c'} />
                <Text style={[styles.marginBadgeText, Number(marginPercent) >= 0 ? styles.marginPositiveText : styles.marginNegativeText]}>
                  {text.estimatedMargin(marginPercent)}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={[styles.saveInfoCard, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder }]}>
              <Text style={[styles.saveInfoTitle, isDark && { color: themeColors.accentText }]}>{text.saveHelperTitle}</Text>
              <Text style={[styles.saveInfoText, isDark && { color: themeColors.muted }]}>• {saveHelperPrimaryText}</Text>
              <Text style={[styles.saveInfoText, isDark && { color: themeColors.muted }]}>• {saveHelperSecondaryText}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.primaryBtnRow}>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{isEditing ? text.saveChanges : text.saveProduct}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={scanVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          {hasPermission ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
              />
              <View pointerEvents="none" style={styles.scannerOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>{text.scanHint}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.centered}><Text style={styles.lockText}>{text.cameraDenied}</Text></View>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={() => { setScanVisible(false); setScanLocked(false); }}>
            <Feather name="x" size={16} color="#fff" />
            <Text style={styles.closeBtnText}>{text.close}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={Boolean(pickerType)} transparent animationType="slide" onRequestClose={() => setPickerType(null)}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>
                {pickerType === 'categorie'
                  ? text.chooseCategoryTitle
                  : pickerType === 'fournisseur'
                    ? text.chooseSupplierTitle
                    : pickerType === 'expirationDay'
                      ? text.expirationDayLabel
                      : pickerType === 'expirationMonth'
                        ? text.expirationMonthFieldLabel
                        : text.expirationYearLabel}
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)}>
                <Feather name="x" size={18} color={neutralIconColor} />
              </TouchableOpacity>
            </View>

            <ScrollView
              testID="picker-options-scroll"
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pickerOptions.map((item) => {
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.optionRow, isDark && { borderBottomColor: themeColors.surfaceBorder }, item.isSelected && styles.optionRowActive, isDark && item.isSelected && { backgroundColor: themeColors.accentBg }]}
                    onPress={() => {
                      item.onPress();
                      setPickerType(null);
                    }}
                  >
                    <Text style={[styles.optionText, isDark && { color: themeColors.text }, item.isSelected && styles.optionTextActive, isDark && item.isSelected && { color: themeColors.accentText }]}>{item.label}</Text>
                    {item.isSelected ? <Feather name="check" size={16} color={accentColor} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {pickerType === 'categorie' || pickerType === 'fournisseur' ? (
              <TouchableOpacity
                style={[styles.clearBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, borderWidth: 1 }]}
                onPress={() => {
                  updateField(pickerType === 'categorie' ? 'categorieId' : 'fournisseurId', '');
                  setPickerType(null);
                }}
              >
                <Text style={[styles.clearBtnText, isDark && { color: themeColors.accentText }]}>{text.noSelection}</Text>
              </TouchableOpacity>
            ) : form.datePeremption ? (
              <TouchableOpacity
                style={[styles.clearBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, borderWidth: 1 }]}
                onPress={() => {
                  clearExpirationDate();
                  setPickerType(null);
                }}
              >
                <Text style={[styles.clearBtnText, isDark && { color: themeColors.accentText }]}>{text.expirationClear}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6F3' },
  content: { padding: 16, paddingBottom: 140 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#1A1A18', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  sectionHeaderTextWrap: { flex: 1, minWidth: 0 },
  sectionIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(27,94,32,0.10)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A18', flexShrink: 1 },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 18, flexShrink: 1 },
  fieldWrap: { marginTop: 4, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  halfField: { flex: 1, minWidth: 150 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 6 },
  helperText: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginTop: 2 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1A1A18' },
  textarea: { minHeight: 96, paddingTop: 12 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 10 },
  inlineInput: { flex: 1 },
  scanBtn: { backgroundColor: 'rgba(27,94,32,0.10)', borderWidth: 1, borderColor: 'rgba(27,94,32,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scanBtnText: { color: '#1B5E20', fontWeight: '700', flexShrink: 1 },
  selectBtn: { minHeight: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconActionBtn: { width: 48, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  selectBtnDisabled: { opacity: 0.6 },
  selectBtnText: { color: '#1A1A18', fontSize: 14, flex: 1, paddingRight: 8 },
  placeholderText: { color: '#9CA3AF' },
  modeGrid: { gap: 10, marginTop: 6 },
  modeCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, backgroundColor: '#FFFFFF' },
  modeCardActive: { borderColor: '#1B5E20', backgroundColor: 'rgba(27,94,32,0.10)' },
  modeCardTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A18', lineHeight: 20, flexShrink: 1 },
  modeCardTitleActive: { color: '#1B5E20' },
  modeCardText: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18, flexShrink: 1 },
  modeCardTextActive: { color: '#1B5E20' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF6E5', borderWidth: 1, borderColor: '#F4D090', borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 8 },
  infoTitle: { fontSize: 12, fontWeight: '800', color: '#D4880F', marginBottom: 2 },
  infoText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  previewCard: { backgroundColor: '#F8F6F3', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginTop: 8 },
  previewTitle: { fontSize: 13, fontWeight: '800', color: '#1A1A18', marginBottom: 6 },
  previewLine: { fontSize: 12, color: '#374151', marginTop: 2 },
  unitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(27,94,32,0.25)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(27,94,32,0.10)', maxWidth: '100%' },
  suggestionChipText: { color: '#1B5E20', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  unitChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  unitChipActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  unitChipText: { color: '#374151', fontWeight: '600' },
  unitChipTextActive: { color: '#fff' },
  emptyState: { borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, padding: 18, alignItems: 'center', gap: 6, backgroundColor: '#F8F6F3', marginTop: 6 },
  emptyStateTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A18' },
  emptyStateText: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  unitCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 14, marginTop: 12, backgroundColor: '#FFFFFF' },
  unitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 },
  unitCardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1A1A18' },
  unitRemoveBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, maxWidth: '100%' },
  unitRemoveBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  unitHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  defaultBtn: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  defaultBtnActive: { borderColor: '#1B5E20', backgroundColor: 'rgba(27,94,32,0.10)' },
  defaultBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  defaultBtnTextActive: { color: '#1B5E20' },
  secondaryBtn: { marginTop: 14, borderWidth: 1, borderColor: '#1B5E20', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(27,94,32,0.10)' },
  secondaryBtnText: { color: '#1B5E20', fontSize: 14, fontWeight: '800' },
  summaryCard: { backgroundColor: '#F8F6F3', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  summaryLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  summaryValue: { fontSize: 12, fontWeight: '800', color: '#1A1A18', flexGrow: 1, flexShrink: 1, minWidth: 120, textAlign: 'right' },
  summaryValueWarning: { color: '#D4880F' },
  summaryValueDanger: { color: '#b91c1c' },
  expirationPreviewCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  expirationPreviewInfo: { backgroundColor: '#E8F5ED', borderColor: '#9ECDB4' },
  expirationPreviewWarning: { backgroundColor: '#FFF6E5', borderColor: '#F4C06A' },
  expirationPreviewDanger: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  expirationPreviewText: { flex: 1, fontSize: 12, fontWeight: '700' },
  expirationPreviewInfoText: { color: '#1B6B3A' },
  expirationPreviewWarningText: { color: '#D4880F' },
  expirationPreviewDangerText: { color: '#b91c1c' },
  summaryUnitsBlock: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  summaryUnitsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  summaryUnitsTitle: { fontSize: 13, fontWeight: '800', color: '#1A1A18', flex: 1 },
  summaryUnitsCount: { fontSize: 11, fontWeight: '700', color: '#374151' },
  summaryUnitCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 10, marginTop: 8 },
  summaryUnitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  summaryUnitName: { flex: 1, fontSize: 12, fontWeight: '800', color: '#1A1A18' },
  summaryUnitPrice: { fontSize: 12, fontWeight: '700', color: '#1B6B3A', textAlign: 'right', flexShrink: 1 },
  summaryUnitMeta: { fontSize: 12, color: '#374151', marginTop: 4 },
  summaryUnitDefault: { alignSelf: 'flex-start', marginTop: 8, fontSize: 11, fontWeight: '800', color: '#1B5E20', backgroundColor: 'rgba(27,94,32,0.10)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  summaryUnitEmpty: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  summaryUnitEquivalences: { marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 10 },
  summaryUnitEquivalencesTitle: { fontSize: 12, fontWeight: '800', color: '#1A1A18', marginBottom: 4 },
  summaryUnitEquivalenceLine: { fontSize: 12, color: '#374151', marginTop: 2 },
  marginBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginTop: 6 },
  marginPositive: { backgroundColor: '#E8F5ED' },
  marginNegative: { backgroundColor: '#fef2f2' },
  marginBadgeText: { fontSize: 12, fontWeight: '800' },
  marginPositiveText: { color: '#1B6B3A' },
  marginNegativeText: { color: '#b91c1c' },
  saveInfoCard: { marginTop: 14, backgroundColor: '#FFF6E5', borderRadius: 14, borderWidth: 1, borderColor: '#F4D090', padding: 12 },
  saveInfoTitle: { fontSize: 13, fontWeight: '800', color: '#D4880F', marginBottom: 6 },
  saveInfoText: { fontSize: 12, color: '#92400E', lineHeight: 18, marginTop: 2 },
  primaryBtn: { backgroundColor: '#1B5E20', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#1B5E20', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8F6F3' },
  lockTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A18', marginBottom: 8, textAlign: 'center' },
  lockText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 18 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1 },
  camera: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 260, height: 160, borderWidth: 2, borderColor: '#FFD600', borderRadius: 12 },
  scanHint: { color: '#fff', marginTop: 22, backgroundColor: 'rgba(7,28,8,0.60)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  closeBtn: { position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(7,28,8,0.80)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,28,8,0.60)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '70%' },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A18' },
  datePartsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  datePartBtn: { flexGrow: 1, minWidth: 96, minHeight: 48, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePartBtnText: { flex: 1, color: '#1A1A18', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  dateInlineValue: { marginTop: 8 },
  calendarHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarNavBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(27,94,32,0.10)', alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1A1A18', textTransform: 'capitalize' },
  wheelPickerRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  wheelPickerColumn: { flex: 1 },
  wheelPickerLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', marginBottom: 6, textAlign: 'center' },
  wheelPickerList: { maxHeight: 144, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#F8F6F3' },
  wheelPickerItem: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#F3EDE6', paddingHorizontal: 8 },
  wheelPickerItemActive: { backgroundColor: '#1B5E20' },
  wheelPickerItemText: { color: '#374151', fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  wheelPickerItemTextActive: { color: '#fff' },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeekdayText: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  calendarDayPlaceholder: { width: '14.2857%', aspectRatio: 1, marginBottom: 6 },
  calendarDayBtn: { width: '14.2857%', aspectRatio: 1, marginBottom: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  calendarDayBtnActive: { backgroundColor: '#1B5E20' },
  calendarDayText: { fontSize: 14, fontWeight: '700', color: '#1A1A18' },
  calendarDayTextActive: { color: '#fff' },
  datePickerActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  datePickerPrimaryBtn: { flex: 1, backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  datePickerPrimaryText: { color: '#fff', fontWeight: '800' },
  datePickerSecondaryBtn: { flex: 1, backgroundColor: 'rgba(27,94,32,0.10)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(27,94,32,0.25)' },
  datePickerSecondaryText: { color: '#1B5E20', fontWeight: '800' },
  optionList: { maxHeight: 320 },
  optionListContent: { paddingBottom: 4 },
  optionRow: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3EDE6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionRowActive: { backgroundColor: 'rgba(27,94,32,0.10)' },
  optionText: { fontSize: 14, color: '#1A1A18' },
  optionTextActive: { color: '#1B5E20', fontWeight: '800' },
  clearBtn: { marginTop: 14, backgroundColor: 'rgba(27,94,32,0.10)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  clearBtnText: { color: '#1B5E20', fontWeight: '800' },
});
