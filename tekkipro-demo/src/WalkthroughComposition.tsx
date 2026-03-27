import { Sequence, useVideoConfig } from 'remotion';
import { TitleScreen } from './TitleScreen';
import { ScreenSlide, SlideConfig } from './ScreenSlide';
import { OutroScreen } from './OutroScreen';

const SLIDES: SlideConfig[] = [
  {
    title: 'Tableau de Bord',
    subtitle: 'Vue globale en temps réel de votre activité commerciale',
    bgColor: '#1B5E20',
    accentColor: '#2E7D32',
    emoji: '📊',
    screenUrl: '',
  },
  {
    title: 'Gestion du Stock',
    subtitle: 'Alertes automatiques et suivi des mouvements d\'inventaire',
    bgColor: '#D32F2F',
    accentColor: '#C62828',
    emoji: '📦',
    screenUrl: '',
  },
  {
    title: 'Point de Vente',
    subtitle: 'Encaissement rapide via Wave, Orange Money ou espèces',
    bgColor: '#1565C0',
    accentColor: '#0D47A1',
    emoji: '🛒',
    screenUrl: '',
  },
  {
    title: 'Historique Ventes',
    subtitle: 'Analysez votre chiffre d\'affaires et les tendances',
    bgColor: '#6A1B9A',
    accentColor: '#4A148C',
    emoji: '📈',
    screenUrl: '',
  },
  {
    title: 'Gestion Employés',
    subtitle: 'Rôles, permissions et performances de votre équipe',
    bgColor: '#E65100',
    accentColor: '#BF360C',
    emoji: '👥',
    screenUrl: '',
  },
  {
    title: 'Gestion Clients',
    subtitle: 'Fidélisez votre clientèle avec un CRM intégré',
    bgColor: '#00695C',
    accentColor: '#004D40',
    emoji: '❤️',
    screenUrl: '',
  },
  {
    title: 'Abonnement',
    subtitle: 'Plans flexibles adaptés à chaque phase de croissance',
    bgColor: '#F9A825',
    accentColor: '#F57F17',
    emoji: '⭐',
    screenUrl: '',
  },
];

// Timing constants (at 30fps)
const TITLE_FRAMES = 90;   // 3s intro
const SLIDE_FRAMES = 120;  // 4s per slide
const OUTRO_FRAMES = 90;   // 3s outro

export const TotalDuration = TITLE_FRAMES + SLIDES.length * SLIDE_FRAMES + OUTRO_FRAMES;

export const WalkthroughComposition: React.FC = () => {
  return (
    <>
      {/* Intro title */}
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleScreen />
      </Sequence>

      {/* Feature slides */}
      {SLIDES.map((slide, i) => (
        <Sequence
          key={slide.title}
          from={TITLE_FRAMES + i * SLIDE_FRAMES}
          durationInFrames={SLIDE_FRAMES}
        >
          <ScreenSlide slide={slide} />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence from={TITLE_FRAMES + SLIDES.length * SLIDE_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <OutroScreen />
      </Sequence>
    </>
  );
};
