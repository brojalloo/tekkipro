import { FiShield, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import AuditLogTable from '../components/AuditLogTable';

export default function SuperAdminLogs() {
  const navigate = useNavigate();
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/app/superadmin')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <FiArrowLeft size={14} /> Retour
      </button>
      <div className="flex items-center gap-2 mb-6">
        <FiShield size={22} className="text-gray-600" />
        <h1 className="text-xl font-semibold text-gray-800">Super-Admin — Logs d'audit</h1>
      </div>
      <AuditLogTable />
    </div>
  );
}
