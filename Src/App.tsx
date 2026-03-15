/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardList, 
  Users, 
  Clock, 
  Settings as SettingsIcon,
  Plus,
  Share2,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  PauseCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Truck,
  Moon,
  Sun,
  FileText,
  Activity,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AutocompleteInput from './components/AutocompleteInput';

type View = 'pointage' | 'attendance' | 'voyages' | 'recolte' | 'fuel' | 'settings';

interface Worker {
  id: number;
  name: string;
  category: string;
}

interface AttendanceRecord {
  worker_id: number;
  name: string;
  category: string;
  status: 'present' | 'repos' | 'absent' | null;
}

interface DailyPointage {
  date: string;
  md_marocain: number;
  md_subsaharienne: number;
  post_fixe: number;
  post_faux_fixe: number;
  gardiens: number;
  controleur: number;
  total_manual: number;
}

interface ExtraHour {
  id: number;
  date: string;
  worker_id: number;
  name: string;
  hours: number;
}

interface Team {
  id: string;
  leaderName: string;
  rec: number;
  deg: number;
  cap: number;
  nationality: 'MR' | 'SS';
  date: string;
}

interface Operation {
  id?: number;
  name: string;
  value: number;
}

const WORKER_OP_MAP: Record<string, string> = {
  'Ahmed EL HATRAF': 'Entretien Filet',
  'Mohammed MOUSSAID': 'Nettoyage + Evacuation',
  'LAARJ Hicham': 'Encadrement administratif',
  'EL GOUYA Salah': 'Irrigation & Fertilisation',
  'DAOUDI Boujamaa': 'Irrigation & Fertilisation',
  'SALEM Hassan': 'Irrigation & Fertilisation',
  'ELMOUADDENE HAMID': 'Irrigation & Fertilisation',
  'OUHAMMOU Mohamed': 'Entretien Filet',
  'Tahiri brahim': 'Entretien Filet',
  'ATIK ALI': 'Couture',
  'EL AALY ABDELOUAHED': 'Couture',
  'Moussafia Lahcen': 'Pointage ou Magasin',
  'Badri Mohammed': 'Pointage ou Magasin',
  'BOUMRIT MOHAMED': 'Activité Tractoriste',
  'ELmsaady Sidi Ahmed': 'Encadrement technique',
  'LAAZROUDI AMARA': 'Encadrement technique',
  'EL KHAYYAT MOUHA': 'Encadrement technique',
  'EL YAMANY LHOUSSAINE': 'Encadrement technique',
  'ELmarbouhy Abdelhadi': 'Irrigation & Fertilisation',
  'EL HANTIT EL HASSAN': 'Irrigation & Fertilisation',
  'BOUTKARIT KASSOU': 'Surveillance',
  'Elouichoany abdelkader': 'Encadrement technique',
  'ELLAHYA ABDELKABIR': 'Activité Tractoriste',
  'AMHAL Mohamed': 'Encadrement',
  'MAKKOU Yassine': 'Encadrement',
  'BITTOS Ahmed': 'Encadrement',
  'OIHMAN Samir': 'Pointage ou Magasin',
  'KAMEL Ayoub': 'Contrôle',
  'CHNIGUER Mohamed': 'Surveillance',
  'Laarj Hicham': 'Encadrement administratif'
};

interface FuelInventory {
  date: string;
  inEssence: number;
  inGasoil: number;
  outEssence: number;
  outGasoil: number;
  stockEssence: number;
  stockGasoil: number;
}

interface Driver {
  id: number;
  name: string;
  license_plate: string;
}

interface Voyage {
  id: number;
  date: string;
  voyage_no: number;
  driver_id: number;
  driver_name: string;
  license_plate: string;
  departure_time: string;
  variety: string;
  export_kg: number;
  ecart_kg: number;
  total_kg: number;
}

const shareViaWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

const WhatsAppPreview = ({ text }: { text: string }) => {
  const format = (t: string) => {
    return t
      .split('\n')
      .map((line, i) => {
        let formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>')
          .replace(/~(.*?)~/g, '<del>$1</del>')
          .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-zinc-800 p-1 rounded font-mono text-[10px] my-1 whitespace-pre-wrap">$1</pre>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-zinc-800 px-1 rounded font-mono text-[10px]">$1</code>');
        
        return <div key={i} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} className="min-h-[1.2em]" />;
      });
  };

  return (
    <div className="bg-[#e5ddd5] dark:bg-zinc-950 p-4 rounded-xl font-sans text-sm text-gray-800 dark:text-zinc-200 shadow-inner max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-zinc-800">
      <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm relative inline-block min-w-[200px] max-w-full break-words border border-gray-100 dark:border-zinc-700">
        {format(text)}
        <div className="text-[10px] text-gray-400 text-right mt-1">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

const ShareConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  text 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  text: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800"
      >
        <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center bg-emerald-600 text-white">
          <h3 className="font-bold flex items-center space-x-2">
            <Share2 size={18} />
            <span>Confirm Sharing</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <XCircle size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
            Review the message before sending to WhatsApp:
          </p>
          
          <WhatsAppPreview text={text} />
          
          <div className="flex space-x-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Share2 size={18} />
              <span>Confirm & Send</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const formatDate = (dateStr: string, separator: string = ' ') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}${separator}${month}${separator}${year}`;
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const val = e.target.value;
  e.target.value = '';
  e.target.value = val;
};

export default function App() {
  const [currentView, setCurrentView] = useState<View>('pointage');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isPointageCollapsed, setIsPointageCollapsed] = useState(false);
  const [isOperationsCollapsed, setIsOperationsCollapsed] = useState(false);
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; text: string } | null>(null);
  const [fuel, setFuel] = useState<FuelInventory>({
    date: selectedDate,
    inEssence: 0,
    inGasoil: 0,
    outEssence: 0,
    outGasoil: 0,
    stockEssence: 0,
    stockGasoil: 0
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const [pointage, setPointage] = useState<DailyPointage>({
    date: selectedDate,
    md_marocain: 0,
    md_subsaharienne: 0,
    post_fixe: 0,
    post_faux_fixe: 0,
    gardiens: 0,
    controleur: 0,
    total_manual: 0
  });

  // Fetch pointage when date changes or view changes to pointage
  useEffect(() => {
    const fetchPointage = async () => {
      const res = await fetch(`/api/pointage?date=${selectedDate}`);
      const data = await res.json();
      setPointage(data);
    };
    
    // Auto-fill Post Fixe and Post Faux Fixe from attendance
    const autoFillAttendance = async () => {
      const fetchCount = async (category: string) => {
        const res = await fetch(`/api/attendance?date=${selectedDate}&category=${encodeURIComponent(category)}`);
        const data: AttendanceRecord[] = await res.json();
        return data.filter(r => r.status === 'present').length;
      };
      
      const pf = await fetchCount('Post Fixe');
      const pff = await fetchCount('Post Faux Fixe');
      
      setPointage(prev => {
        const next = {
          ...prev,
          post_fixe: pf,
          post_faux_fixe: pff,
        };
        next.total_manual = calculateTotal(next);
        return next;
      });
    };

    fetchPointage().then(() => {
      if (currentView === 'pointage') {
        autoFillAttendance();
      }
    });
  }, [selectedDate, currentView]);

  useEffect(() => {
    const fetchTeams = async () => {
      const res = await fetch(`/api/teams?date=${selectedDate}`);
      const data = await res.json();
      
      if (data.length === 0) {
        // Try to get previous day's teams to carry over names
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        const prevRes = await fetch(`/api/teams?date=${prevDateStr}`);
        const prevData: Team[] = await prevRes.json();
        
        if (prevData.length > 0) {
          const carriedOver = prevData.map(t => ({
            ...t,
            id: Math.random().toString(36).substr(2, 9),
            rec: 0,
            deg: 0,
            cap: 0,
            date: selectedDate
          }));
          setTeams(carriedOver);
          // Save immediately
          await fetch(`/api/teams?date=${selectedDate}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carriedOver)
          });
          return;
        }
      }
      setTeams(data);
    };
    fetchTeams();
  }, [selectedDate]);

  useEffect(() => {
    const fetchFuel = async () => {
      const res = await fetch(`/api/fuel?date=${selectedDate}`);
      const data = await res.json();
      setFuel(data);
    };
    fetchFuel();
  }, [selectedDate]);

  useEffect(() => {
    const fetchOperations = async () => {
      const res = await fetch(`/api/operations?date=${selectedDate}`);
      const data = await res.json();
      setOperations(data);
    };
    fetchOperations();
  }, [selectedDate]);

  const savePointage = async (updated: DailyPointage) => {
    setPointage(updated);
    await fetch('/api/pointage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const autoFillOperations = async () => {
    // 1. Fetch attendance
    const attRes = await fetch(`/api/attendance?date=${selectedDate}`);
    const attendance: any[] = await attRes.json();
    const presentWorkers = attendance.filter(a => a.status === 'present');

    // 2. Aggregate from workers
    const opCounts: Record<string, number> = {};
    presentWorkers.forEach(w => {
      const opName = WORKER_OP_MAP[w.name];
      if (opName) {
        opCounts[opName] = (opCounts[opName] || 0) + 1;
      }
    });

    // 3. Aggregate from Recolte
    const ttRec = teams.reduce((sum, t) => sum + t.rec, 0);
    const ttCap = teams.reduce((sum, t) => sum + t.cap, 0);
    const ttDeg = teams.reduce((sum, t) => sum + t.deg, 0);

    if (ttRec > 0) opCounts['Récolte'] = (opCounts['Récolte'] || 0) + ttRec;
    if (ttCap > 0) opCounts['Encadrement'] = (opCounts['Encadrement'] || 0) + ttCap;
    if (ttDeg > 0) opCounts['Dégagement (Myrtille)'] = (opCounts['Dégagement (Myrtille)'] || 0) + ttDeg;

    // 4. Add "Contrôle" for the user and others
    if (pointage.controleur > 0) {
      // Check if Kamel Ayoub is already counted in opCounts['Contrôle']
      const isKamelPresent = presentWorkers.some(w => w.name === 'KAMEL Ayoub');
      if (isKamelPresent) {
        // Kamel is already in opCounts['Contrôle'] as 1. 
        // We add the rest from pointage.controleur (which includes Kamel + User + others)
        opCounts['Contrôle'] = pointage.controleur;
      } else {
        opCounts['Contrôle'] = (opCounts['Contrôle'] || 0) + pointage.controleur;
      }
    }

    // Convert to Operation[]
    const newOps: Operation[] = Object.entries(opCounts).map(([name, value]) => ({ name, value }));
    
    if (newOps.length > 0) {
      saveOperations(newOps);
    }
  };

  const requestShare = (text: string) => {
    setShareModal({ isOpen: true, text });
  };

  const saveOperations = async (updated: Operation[]) => {
    setOperations(updated);
    await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, operations: updated })
    });
  };

  const calculateTotal = (p: DailyPointage) => {
    return p.md_marocain + p.md_subsaharienne + p.post_fixe + p.post_faux_fixe + p.gardiens + p.controleur;
  };

  const handlePointageChange = (field: keyof DailyPointage, value: number) => {
    const updated = { ...pointage, [field]: value };
    
    if (field === 'total_manual') {
      // If total is changed, calculate md_marocain
      const others = updated.md_subsaharienne + updated.post_fixe + updated.post_faux_fixe + updated.gardiens + updated.controleur;
      updated.md_marocain = value - others;
    } else {
      // If any other field is changed, calculate total
      updated.total_manual = calculateTotal(updated);
    }
    
    savePointage(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-20 font-sans transition-colors duration-300" dir="ltr">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-3 shadow-md sticky top-0 z-20">
        <div className="flex justify-center items-center max-w-2xl mx-auto font-bold text-lg tracking-wide">
          CFQP-07 • {formatDate(selectedDate)}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {currentView === 'pointage' && (
            <motion.div 
              key="pointage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Points of Operations Section */}
              <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <div 
                  className="flex justify-between items-center mb-4 border-b dark:border-zinc-800 pb-2 cursor-pointer"
                  onClick={() => setIsOperationsCollapsed(!isOperationsCollapsed)}
                >
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-2">
                    <Activity size={20} />
                    <span>Points of Operations</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        autoFillOperations();
                      }}
                      className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors flex items-center space-x-1 text-xs font-bold"
                      title="Smart Fill from Data"
                    >
                      <Sparkles size={14} />
                      <span className="hidden sm:inline">Smart Fill</span>
                    </button>
                    <div className="text-gray-400 dark:text-zinc-500">
                      {isOperationsCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </div>
                  </div>
                </div>

                {!isOperationsCollapsed && (
                  <div className="space-y-3">
                    {operations.map((op, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-zinc-800 p-2 rounded-xl border border-gray-100 dark:border-zinc-700">
                        <div className="flex-1">
                          <AutocompleteInput 
                            type="operation"
                            value={op.name}
                            onChange={(val) => {
                              const next = [...operations];
                              next[idx].name = val;
                              saveOperations(next);
                            }}
                            placeholder="Operation..."
                          />
                        </div>
                        <input 
                          type="number" 
                          value={op.value === 0 ? '' : op.value}
                          placeholder="0"
                          onFocus={handleFocus}
                          onChange={(e) => {
                            const next = [...operations];
                            next[idx].value = parseFloat(e.target.value) || 0;
                            saveOperations(next);
                          }}
                          className="w-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-right font-black outline-none text-emerald-600"
                        />
                        <button 
                          onClick={() => {
                            const next = operations.filter((_, i) => i !== idx);
                            saveOperations(next);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const next = [...operations, { name: '', value: 0 }];
                        saveOperations(next);
                      }}
                      className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl text-gray-400 dark:text-zinc-500 font-bold flex items-center justify-center space-x-2 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                    >
                      <Plus size={20} />
                      <span>Add Operation</span>
                    </button>
                  </div>
                )}
              </section>

              <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <div 
                  className="flex justify-between items-center mb-4 border-b dark:border-zinc-800 pb-2 cursor-pointer"
                  onClick={() => setIsPointageCollapsed(!isPointageCollapsed)}
                >
                  <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-2">
                    <ClipboardList size={20} />
                    <span>Daily Pointage</span>
                  </h2>
                  <div className="text-gray-400 dark:text-zinc-500">
                    {isPointageCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </div>

                {!isPointageCollapsed && (
                  <div className="space-y-3">
                    <PointageInput 
                      label="Total" 
                      value={pointage.total_manual} 
                      onChange={(val) => handlePointageChange('total_manual', val)} 
                      isTotal
                    />
                    <PointageInput 
                      label="M.D Marocain" 
                      value={pointage.md_marocain} 
                      onChange={(val) => handlePointageChange('md_marocain', val)} 
                    />
                    <PointageInput 
                      label="M.D Subsaharienne" 
                      value={pointage.md_subsaharienne} 
                      onChange={(val) => handlePointageChange('md_subsaharienne', val)} 
                    />
                    <PointageInput 
                      label="Post Fixe" 
                      value={pointage.post_fixe} 
                      onChange={(val) => handlePointageChange('post_fixe', val)} 
                    />
                    <PointageInput 
                      label="Post Faux Fixe" 
                      value={pointage.post_faux_fixe} 
                      onChange={(val) => handlePointageChange('post_faux_fixe', val)} 
                    />
                    <PointageInput 
                      label="Gardiens" 
                      value={pointage.gardiens} 
                      onChange={(val) => handlePointageChange('gardiens', val)} 
                    />
                    <PointageInput 
                      label="Controleur" 
                      value={pointage.controleur} 
                      onChange={(val) => handlePointageChange('controleur', val)} 
                    />

                    <button 
                      onClick={() => {
                        const dateFormatted = formatDate(selectedDate, '-');
                        
                        const operationsText = operations.length > 0 
                          ? `\n---------------------------------------------\n` +
                            `\`Points of Operations :\`\n\n` +
                            operations.map(op => `* *${op.name.padEnd(20)} :* \`${op.value}\``).join('\n\n')
                          : '';

                        const text = `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
                          `---------------------------------------------\n` +
                          `\`Pointage de domaine :\`\n\n` +
                          `* *M.D Marocaine         :* \`${pointage.md_marocain}\`\n\n` +
                          `* *M.D Subsaharienne :* \`${pointage.md_subsaharienne}\`\n\n` +
                          `* *POSTE FIXE           :* \`${pointage.post_fixe}\`\n\n` +
                          `* *FAUX FIXE              :* \`${pointage.post_faux_fixe}\`\n\n` +
                          `* *GARDIENS             :* \`${pointage.gardiens}\`\n\n` +
                          `* *Contrôleur              :* \`${pointage.controleur}\`\n` +
                          operationsText +
                          `\n---------------------------------------------\n` +
                          `\`TOTAL          : ${pointage.total_manual}\``;
                        requestShare(text);
                      }}
                      className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
                    >
                      <Share2 size={20} />
                      <span>sharing</span>
                    </button>
                  </div>
                )}
              </section>

              {/* Merged Extra Hours Section */}
              <ExtraHoursSection date={selectedDate} requestShare={requestShare} />
            </motion.div>
          )}

          {currentView === 'attendance' && (
            <AttendanceView date={selectedDate} requestShare={requestShare} />
          )}

          {currentView === 'voyages' && (
            <VoyagesView date={selectedDate} requestShare={requestShare} />
          )}

          {currentView === 'recolte' && (
            <RecolteView 
              date={selectedDate} 
              teams={teams} 
              setTeams={setTeams} 
              requestShare={requestShare}
            />
          )}

          {currentView === 'fuel' && (
            <FuelView 
              date={selectedDate} 
              fuel={fuel} 
              setFuel={setFuel} 
              requestShare={requestShare}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView 
              setDate={setSelectedDate}
              setView={setCurrentView}
              darkMode={darkMode} 
              setDarkMode={setDarkMode}
              currentDate={selectedDate}
              requestShare={requestShare}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 flex justify-around p-2 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <NavButton active={currentView === 'pointage'} onClick={() => setCurrentView('pointage')} icon={<ClipboardList />} label="Pointage" />
        <NavButton active={currentView === 'attendance'} onClick={() => setCurrentView('attendance')} icon={<Users />} label="Attendance" />
        <NavButton active={currentView === 'voyages'} onClick={() => setCurrentView('voyages')} icon={<Truck />} label="Voyages" />
        <NavButton active={currentView === 'recolte'} onClick={() => setCurrentView('recolte')} icon={<FileText />} label="Recolte" />
        <NavButton active={currentView === 'fuel'} onClick={() => setCurrentView('fuel')} icon={<RefreshCw />} label="Fuel" />
        <NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon={<SettingsIcon />} label="Settings" />
      </nav>
    </div>
  );
}

function PointageInput({ label, value, onChange, isTotal }: { label: string, value: number, onChange: (val: number) => void, isTotal?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
      isTotal 
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' 
        : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700'
    }`}>
      <span className={`text-sm font-bold ${
        isTotal ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-700 dark:text-zinc-300'
      }`}>
        {label}
      </span>
      <div className="flex items-center">
        <input 
          type="number" 
          value={value === 0 ? '' : value}
          placeholder="0"
          onFocus={handleFocus}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className={`w-20 bg-transparent text-right font-black text-lg outline-none focus:ring-0 ${
            isTotal ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-zinc-100'
          }`}
          max="999"
        />
        <span className="ml-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tighter">Workers</span>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center p-1 transition-colors ${active ? 'text-emerald-600' : 'text-gray-400'}`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}

// --- Sub-Views ---

function AttendanceView({ date, requestShare }: { date: string; requestShare: (text: string) => void }) {
  const [activeTab, setActiveTab] = useState<'fixe' | 'other'>('fixe');
  const [fixeRecords, setFixeRecords] = useState<AttendanceRecord[]>([]);
  const [fauxFixeRecords, setFauxFixeRecords] = useState<AttendanceRecord[]>([]);
  
  const categoriesFixe = ['Post Fixe', 'Post Faux Fixe'];
  const categoriesOther = ['Sans transport & Douar', 'Transport personnel', 'Ouvrier de secteur'];

  useEffect(() => {
    const fetchFixe = async () => {
      const res1 = await fetch(`/api/attendance?date=${date}&category=${encodeURIComponent('Post Fixe')}`);
      setFixeRecords(await res1.json());
      const res2 = await fetch(`/api/attendance?date=${date}&category=${encodeURIComponent('Post Faux Fixe')}`);
      setFauxFixeRecords(await res2.json());
    };
    fetchFixe();
  }, [date]);

  const shareFixeSummary = () => {
    const dateFormatted = formatDate(date, '-');
    const pfAbsent = fixeRecords.filter(r => r.status === 'absent' || r.status === 'repos');
    const ffAbsent = fauxFixeRecords.filter(r => r.status === 'absent' || r.status === 'repos');

    if (pfAbsent.length === 0 && ffAbsent.length === 0) {
      requestShare(`\`\`\`le ${dateFormatted}\`\`\`\n---------------------------------------------\n\`QP 07\` • *R.A.S*`);
      return;
    }

    let text = `\`QP 07\` • \`\`\`le ${dateFormatted}\`\`\`\n---------------------------------------------\n`;
    
    if (pfAbsent.length > 0) {
      text += `\`PF Absent(or : PF Repos) :\`\n`;
      pfAbsent.forEach(r => text += `* ${r.name}\n`);
      text += '\n';
    }

    if (ffAbsent.length > 0) {
      text += `\`FF Absent(or : FF Repos) :\`\n`;
      ffAbsent.forEach(r => text += `* ${r.name}\n`);
    }

    requestShare(text.trim());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex bg-gray-200 p-1 rounded-lg">
        <button 
          onClick={() => setActiveTab('fixe')}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'fixe' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
        >
          Post Fixe / Faux Fixe
        </button>
        <button 
          onClick={() => setActiveTab('other')}
          className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'other' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
        >
          Transport / Sector
        </button>
      </div>

      {activeTab === 'fixe' && (
        <button 
          onClick={shareFixeSummary}
          className="w-full bg-emerald-600 text-white py-2 rounded-md font-bold flex items-center justify-center space-x-2 shadow-sm"
        >
          <Share2 size={18} />
          <span>Share Fixe/Faux Fixe Summary</span>
        </button>
      )}

      {activeTab === 'fixe' ? (
        <div className="space-y-6">
          {categoriesFixe.map(cat => (
            <AttendanceCategory key={cat} date={date} category={cat} type="tri" requestShare={requestShare} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {categoriesOther.map(cat => (
            <AttendanceCategory key={cat} date={date} category={cat} type="dual" requestShare={requestShare} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface AttendanceCategoryProps {
  date: string;
  category: string;
  type: 'tri' | 'dual';
  requestShare: (text: string) => void;
}

const AttendanceCategory: React.FC<AttendanceCategoryProps> = ({ date, category, type, requestShare }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [newName, setNewName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchRecords = async () => {
    const res = await fetch(`/api/attendance?date=${date}&category=${encodeURIComponent(category)}`);
    const data = await res.json();
    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, [date, category]);

  const addWorker = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, category })
    });
    if (res.ok) {
      setNewName('');
      fetchRecords();
    }
  };

  const updateStatus = async (worker_id: number, status: string) => {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, worker_id, status })
    });
    fetchRecords();
  };

  const getSummary = () => {
    const dateFormatted = formatDate(date, '-');
    const presentWorkers = records.filter(r => r.status === 'present');
    
    let title = category;
    if (category === 'Sans transport & Douar') title = 'Sans transports & Douar';
    if (category === 'Ouvrier de secteur') title = 'Ovr de secteur';

    let text = `\`QP 07\`•\`\`\`le ${dateFormatted}\`\`\`\n---------------------------------------------\n\`${title}:\`\n\n`;
    
    presentWorkers.forEach(r => {
      text += `* ${r.name}\n`;
    });
    
    return text.trim();
  };

  return (
    <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-4 border-b dark:border-zinc-800 pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">{category}</h3>
          <span className="text-gray-400 dark:text-zinc-500 text-xs">({records.filter(r => r.status === 'present').length} present)</span>
        </div>
        <div className="flex items-center space-x-2">
          {category !== 'Post Fixe' && category !== 'Post Faux Fixe' && (
            <button 
              onClick={(e) => { e.stopPropagation(); requestShare(getSummary()); }}
              className="text-emerald-600 dark:text-emerald-400 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
            >
              <Share2 size={18} />
            </button>
          )}
          <div className="text-gray-400 dark:text-zinc-500">
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-3">
            {records.map(r => (
              <div key={r.worker_id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <span className="font-medium text-gray-700 dark:text-zinc-300">{r.name}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => updateStatus(r.worker_id, 'present')}
                    className={`p-2 rounded-md transition-colors ${r.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700'}`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  {type === 'tri' && (
                    <button 
                      onClick={() => updateStatus(r.worker_id, 'repos')}
                      className={`p-2 rounded-md transition-colors ${r.status === 'repos' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700'}`}
                    >
                      <PauseCircle size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => updateStatus(r.worker_id, 'absent')}
                    className={`p-2 rounded-md transition-colors ${r.status === 'absent' ? 'bg-red-500 text-white' : 'bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700'}`}
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-end space-x-2">
            <div className="flex-1">
              <AutocompleteInput 
                type="worker_name"
                label="Quick Add Worker"
                value={newName}
                onChange={setNewName}
                placeholder="Name..."
              />
            </div>
            <button 
              onClick={addWorker}
              className="mb-1 bg-emerald-600 text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </>
      )}
    </section>
  );
};

function ExtraHoursSection({ date, requestShare }: { date: string; requestShare: (text: string) => void }) {
  const [workerName, setWorkerName] = useState('');
  const [hours, setHours] = useState<number>(0);
  const [extraHours, setExtraHours] = useState<ExtraHour[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchData = async () => {
    const res = await fetch(`/api/extra-hours?date=${date}`);
    setExtraHours(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const addExtraHours = async () => {
    if (!workerName.trim() || hours <= 0) return;
    
    // First, find or create the worker to get an ID
    // We'll use a generic category if creating a new one
    const wRes = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workerName, category: 'Extra' })
    });
    const worker = await wRes.json();

    await fetch('/api/extra-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, worker_id: worker.id, hours })
    });
    
    setHours(0);
    setWorkerName('');
    fetchData();
  };

  const deleteExtraHour = async (id: number) => {
    await fetch(`/api/extra-hours/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const shareExtraHours = () => {
    const dateFormatted = formatDate(date, '-');
    let text = `\`QP 07\`•\`\`\`le ${dateFormatted}\`\`\`\n---------------------------------------------\n\`Heures supplémentaires :\`\n\n`;
    
    // Sort by hours descending
    const sorted = [...extraHours].sort((a, b) => b.hours - a.hours);
    
    let lastHours = -1;
    sorted.forEach(eh => {
      if (lastHours !== -1 && lastHours !== eh.hours) {
        text += '\n';
      }
      const hoursDisplay = eh.hours === 0.5 ? '30Min' : `${eh.hours}H`;
      text += `${eh.name} • ${hoursDisplay}\n`;
      lastHours = eh.hours;
    });
    
    requestShare(text.trim());
  };

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-4 border-b dark:border-zinc-800 pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">Extra Hours - Heures Sup</h2>
            <button 
              onClick={(e) => { e.stopPropagation(); shareExtraHours(); }}
              className="text-emerald-600 dark:text-emerald-400 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
            >
              <Share2 size={18} />
            </button>
          </div>
          <div className="text-gray-400 dark:text-zinc-500">
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <AutocompleteInput 
                type="worker_name"
                label="Worker Name"
                value={workerName}
                onChange={setWorkerName}
                placeholder="Enter or select worker..."
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
              <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Hours</span>
              <div className="flex items-center">
                <input 
                  type="number" 
                  step="0.5"
                  value={hours === 0 ? '' : hours}
                  placeholder="0"
                  onFocus={(e) => {
                    const val = e.target.value;
                    e.target.value = '';
                    e.target.value = val;
                  }}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent text-right font-black text-xl outline-none focus:ring-0 text-gray-900 dark:text-zinc-100"
                />
                <span className="ml-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tighter">H</span>
              </div>
            </div>

            <button 
              onClick={addExtraHours}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Hours</span>
            </button>
          </div>
        )}
      </section>

      {!isCollapsed && (
        <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <h3 className="font-bold text-gray-700 dark:text-zinc-300 mb-3">Today's Extra Hours Record:</h3>
          <div className="space-y-2">
            {extraHours.length === 0 && <p className="text-gray-400 dark:text-zinc-500 text-center py-4">No records found</p>}
            {extraHours.map(eh => (
              <div key={eh.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700">
                <div>
                  <p className="font-medium text-gray-800 dark:text-zinc-200">{eh.name}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{eh.hours} hours</p>
                </div>
                <button 
                  onClick={() => deleteExtraHour(eh.id)}
                  className="text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
interface WheelPickerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

function WheelPicker({ options, value, onChange, label }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * 50;
      }
    }
  }, [value, options]);

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / 50);
      if (options[index] && options[index] !== value) {
        onChange(options[index]);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-[10px] font-bold text-gray-400 mb-1">{label}</span>}
      <div className="relative w-16 h-[150px] bg-gray-50 dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
        <div className="absolute top-[50px] left-0 right-0 h-[50px] border-y border-emerald-500/30 pointer-events-none bg-emerald-500/5" />
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="wheel-container h-full"
        >
          <div className="h-[50px]" /> {/* Padding top */}
          {options.map((opt) => (
            <div 
              key={opt} 
              className={`wheel-item text-lg font-bold ${value === opt ? 'text-emerald-600 scale-110' : 'text-gray-400 opacity-50'}`}
            >
              {opt}
            </div>
          ))}
          <div className="h-[50px]" /> {/* Padding bottom */}
        </div>
      </div>
    </div>
  );
}

function TimePickerModal({ 
  isOpen, 
  onClose, 
  hour, 
  minute, 
  period, 
  onHourChange, 
  onMinuteChange, 
  onPeriodChange 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  hour: string;
  minute: string;
  period: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  onPeriodChange: (p: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-gray-100 dark:border-zinc-800"
      >
        <h3 className="text-center font-bold text-emerald-800 dark:text-emerald-400 mb-6">Select Time</h3>
        
        <div className="flex justify-center space-x-4 mb-8">
          <WheelPicker 
            label="HOUR"
            options={Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))} 
            value={hour} 
            onChange={onHourChange} 
          />
          <WheelPicker 
            label="MIN"
            options={Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))} 
            value={minute} 
            onChange={onMinuteChange} 
          />
          <WheelPicker 
            label="AM/PM"
            options={['AM', 'PM']} 
            value={period} 
            onChange={onPeriodChange} 
          />
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          Confirm
        </button>
      </motion.div>
    </div>
  );
}

function DatePickerModal({ 
  isOpen, 
  onClose, 
  date,
  onDateChange
}: { 
  isOpen: boolean; 
  onClose: () => void;
  date: string;
  onDateChange: (d: string) => void;
}) {
  if (!isOpen) return null;

  const d = new Date(date);
  const [day, setDay] = useState(d.getDate().toString().padStart(2, '0'));
  const [month, setMonth] = useState((d.getMonth() + 1).toString().padStart(2, '0'));
  const year = d.getFullYear().toString();

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleConfirm = () => {
    onDateChange(`${year}-${month}-${day}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-gray-100 dark:border-zinc-800"
      >
        <h3 className="text-center font-bold text-emerald-800 dark:text-emerald-400 mb-6">Select Date</h3>
        
        <div className="flex justify-center space-x-4 mb-8">
          <WheelPicker 
            label="DAY"
            options={days} 
            value={day} 
            onChange={setDay} 
          />
          <WheelPicker 
            label="MONTH"
            options={months} 
            value={month} 
            onChange={setMonth} 
          />
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          Confirm
        </button>
      </motion.div>
    </div>
  );
}

function VoyagesView({ date, requestShare }: { date: string; requestShare: (text: string) => void }) {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [summaryDate, setSummaryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  
  // Form state
  const [voyageNo, setVoyageNo] = useState<number>(1);
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [variety, setVariety] = useState('Eurika SR');
  const [exportKg, setExportKg] = useState<number>(0);
  const [ecartKg, setEcartKg] = useState<number>(0);

  // Time state
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const departureTime = `${hour} : ${minute} ${period}`;

  const fetchVoyages = async () => {
    const res = await fetch(`/api/voyages?date=${date}`);
    const data = await res.json();
    setVoyages(data);
    if (data.length > 0) {
      setVoyageNo(Math.max(...data.map((v: Voyage) => v.voyage_no)) + 1);
    } else {
      setVoyageNo(1);
    }
  };

  const fetchDrivers = async () => {
    const res = await fetch('/api/drivers');
    setDrivers(await res.json());
  };

  useEffect(() => {
    fetchVoyages();
    fetchDrivers();
  }, [date]);

  useEffect(() => {
    const driver = drivers.find(d => d.name === driverName);
    if (driver) {
      setLicensePlate(driver.license_plate);
    }
  }, [driverName, drivers]);

  const saveVoyage = async () => {
    if (!driverName || !licensePlate || !variety) return;

    await fetch('/api/voyages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        voyage_no: voyageNo,
        driver_name: driverName,
        license_plate: licensePlate,
        departure_time: departureTime,
        variety,
        export_kg: exportKg,
        ecart_kg: ecartKg
      })
    });

    fetchVoyages();
    fetchDrivers();
    setExportKg(0);
    setEcartKg(0);
  };

  const deleteVoyage = async (id: number) => {
    await fetch(`/api/voyages/${id}`, { method: 'DELETE' });
    fetchVoyages();
  };

  const shareVoyage = (v: Voyage) => {
    const dateFormatted = formatDate(v.date, '-');
    const text = `---------------------------------------------\n` +
      `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n` +
      `* *N° VYG           :* № \`${v.voyage_no}\`\n` +
      `* *CHAUFFEUR :* ${v.driver_name}\n` +
      `* *MATRICULE  :* ${v.license_plate}\n` +
      `* *DÉPART         :* ${v.departure_time}\n\n` +
      `* *VARIÉTÉ  :* ${v.variety}\n` +
      `* *EXPORE   :*  ${v.export_kg.toFixed(1)} KG\n` +
      `* *ÉCART     :*  ${v.ecart_kg.toFixed(1)} KG\n` +
      `---------------------------------------------\n` +
      `\`TOTAL    : ${v.total_kg.toFixed(1)} KG\`\n` +
      `---------------------------------------------`;
    
    requestShare(text);
  };

  const shareDailyTotal = async (targetDate: string) => {
    const res = await fetch(`/api/voyages?date=${targetDate}`);
    const data: Voyage[] = await res.json();
    
    if (data.length === 0) return;

    const totalExport = data.reduce((sum, v) => sum + v.export_kg, 0);
    const totalEcart = data.reduce((sum, v) => sum + v.ecart_kg, 0);
    const totalTotal = data.reduce((sum, v) => sum + v.total_kg, 0);
    const variety = data[0].variety;

    const dateFormatted = formatDate(targetDate, '-');
    const text = `---------------------------------------------\n` +
      `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n` +
      `*VARIÉTÉ   :* ${variety}\n` +
      `*EXPORT    :* ${totalExport.toFixed(1)} KG\n` +
      `*ÉCART      :*  ${totalEcart.toFixed(1)} KG\n` +
      `---------------------------------------------\n` +
      `\`TOTAL   : ${totalTotal.toFixed(1)} KG\`\n` +
      `---------------------------------------------`;
    
    requestShare(text);
  };

  const shareLastExit = async (targetDate: string) => {
    const res = await fetch(`/api/voyages?date=${targetDate}`);
    const data: Voyage[] = await res.json();
    
    if (data.length === 0) return;

    const last = data.sort((a, b) => b.voyage_no - a.voyage_no)[0];

    const dateFormatted = formatDate(targetDate, '-');
    const text = `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n\n` +
      `*H. SORTIE   :* ${last.departure_time}\n` +
      `*MATRICULE :* ${last.license_plate}`;
    
    requestShare(text);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-4 border-b dark:border-zinc-800 pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-2">
            <Truck size={20} />
            <span>New Voyage</span>
          </h2>
          <div className="text-gray-400 dark:text-zinc-500">
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">VYG №</span>
                <input 
                  type="number" 
                  value={voyageNo === 0 ? '' : voyageNo}
                  placeholder="0"
                  onFocus={(e) => {
                    const val = e.target.value;
                    e.target.value = '';
                    e.target.value = val;
                  }}
                  onChange={(e) => setVoyageNo(parseInt(e.target.value) || 0)}
                  className="w-12 bg-transparent text-right font-black text-lg outline-none text-emerald-700 dark:text-emerald-400"
                />
              </div>
              <button 
                onClick={() => setIsTimePickerOpen(true)}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 active:scale-95 transition-transform"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">Departure</span>
                  <span className="text-sm font-black text-gray-800 dark:text-zinc-200">{departureTime}</span>
                </div>
                <Clock size={18} className="text-emerald-600" />
              </button>
            </div>

            <TimePickerModal 
              isOpen={isTimePickerOpen}
              onClose={() => setIsTimePickerOpen(false)}
              hour={hour}
              minute={minute}
              period={period}
              onHourChange={setHour}
              onMinuteChange={setMinute}
              onPeriodChange={(p) => setPeriod(p as 'AM' | 'PM')}
            />

            <AutocompleteInput 
              type="driver_name"
              label="CHAUFFEUR"
              value={driverName}
              onChange={setDriverName}
              placeholder="Driver name..."
            />

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
              <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">MATRICULE</span>
              <input 
                type="text" 
                value={licensePlate} 
                onFocus={(e) => {
                  const val = e.target.value;
                  e.target.value = '';
                  e.target.value = val;
                }}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="74903 | A | 34"
                className="flex-1 bg-transparent text-right font-bold text-gray-900 dark:text-zinc-100 outline-none"
              />
            </div>

            <AutocompleteInput 
              type="variety"
              label="VARIÉTÉ"
              value={variety}
              onChange={setVariety}
              placeholder="Eurika SR..."
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">EXPORT (KG)</span>
                <input 
                  type="number" 
                  step="0.1"
                  value={exportKg === 0 ? '' : exportKg}
                  placeholder="0"
                  onFocus={(e) => {
                    const val = e.target.value;
                    e.target.value = '';
                    e.target.value = val;
                  }}
                  onChange={(e) => setExportKg(parseFloat(e.target.value) || 0)}
                  className="bg-transparent font-black text-2xl outline-none text-emerald-800 dark:text-emerald-300"
                />
              </div>
              <div className="flex flex-col p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">ÉCART (KG)</span>
                <input 
                  type="number" 
                  step="0.1"
                  value={ecartKg === 0 ? '' : ecartKg}
                  placeholder="0"
                  onFocus={(e) => {
                    const val = e.target.value;
                    e.target.value = '';
                    e.target.value = val;
                  }}
                  onChange={(e) => setEcartKg(parseFloat(e.target.value) || 0)}
                  className="bg-transparent font-black text-2xl outline-none text-amber-800 dark:text-amber-300"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-lg border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">TOTAL:</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-300">{(exportKg + ecartKg).toFixed(1)} KG</span>
            </div>

            <button 
              onClick={saveVoyage}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
            >
              <Plus size={20} />
              <span>Save Voyage</span>
            </button>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Summary Sharing</h3>
          <button 
            onClick={() => setIsDatePickerOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-zinc-800 px-3 py-1 rounded-full border border-emerald-100 dark:border-zinc-700"
          >
            {formatDate(summaryDate)}
          </button>
        </div>

        <DatePickerModal 
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          date={summaryDate}
          onDateChange={setSummaryDate}
        />

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => shareDailyTotal(summaryDate)}
            className="bg-emerald-600 text-white p-3 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 shadow-md active:scale-95 transition-transform"
          >
            <Share2 size={20} />
            <span className="text-xs">Prod</span>
          </button>
          <button 
            onClick={() => shareLastExit(summaryDate)}
            className="bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 shadow-sm active:scale-95 transition-transform"
          >
            <Clock size={20} />
            <span className="text-xs">Exit</span>
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h3 className="font-bold text-gray-700 dark:text-zinc-300 mb-3 border-b dark:border-zinc-800 pb-2">Shipments Record:</h3>
        <div className="space-y-3">
          {voyages.length === 0 && <p className="text-gray-400 dark:text-zinc-500 text-center py-4">No shipments recorded for this date.</p>}
          {voyages.map(v => (
            <div key={v.id} className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700 flex justify-between items-center">
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-400">Voyage № {v.voyage_no}</p>
                <p className="text-sm text-gray-600 dark:text-zinc-400">{v.driver_name} • {v.departure_time}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">{v.variety} • {v.total_kg.toFixed(1)} KG</p>
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => shareVoyage(v)}
                  className="text-emerald-600 dark:text-emerald-400 p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  onClick={() => deleteVoyage(v.id)}
                  className="text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function SettingsView({ 
  setDate, 
  setView,
  darkMode, 
  setDarkMode,
  currentDate,
  requestShare
}: { 
  setDate: (d: string) => void;
  setView: (v: View) => void;
  darkMode: boolean; 
  setDarkMode: (v: boolean) => void;
  currentDate: string;
  requestShare: (text: string) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [archiveDate, setArchiveDate] = useState(currentDate);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setStatus('Backup exported successfully');
    } catch (e) {
      setStatus('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          setStatus('Data restored successfully. Please refresh.');
        } else {
          setStatus('Import failed');
        }
      } catch (err) {
        setStatus('Invalid file');
      }
    };
    reader.readAsText(file);
  };

  const shareDailySummary = async () => {
    try {
      const [voyagesRes, pointageRes, extraRes] = await Promise.all([
        fetch(`/api/voyages?date=${currentDate}`),
        fetch(`/api/pointage?date=${currentDate}`),
        fetch(`/api/extra-hours?date=${currentDate}`)
      ]);

      const voyages: Voyage[] = await voyagesRes.json();
      const pointage: DailyPointage = await pointageRes.json();
      const extra: ExtraHour[] = await extraRes.json();

      const totalExport = voyages.reduce((sum, v) => sum + v.export_kg, 0);
      const totalWorkers = pointage.total_manual || 0;
      const totalExtra = extra.reduce((sum, e) => sum + e.hours, 0);

      const dateFormatted = formatDate(currentDate, '-');
      
      const text = `📊 *RÉSUMÉ JOURNALIER* • \`\`\`${dateFormatted}\`\`\`\n` +
        `---------------------------------------------\n` +
        `🏗️ *PRODUCTION :*\n` +
        `• Total Export : ${totalExport.toFixed(1)} KG\n` +
        `• Nb Voyages : ${voyages.length}\n\n` +
        `👥 *MAIN D'OEUVRE :*\n` +
        `• Total Pointage : ${totalWorkers}\n` +
        `• Heures Supp : ${totalExtra} H\n` +
        `---------------------------------------------\n` +
        `🌱 *QP 07* • Farm Assistant`;

      requestShare(text);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 border-b dark:border-zinc-800 pb-2">Archive Search</h2>
        <div className="flex space-x-2">
          <input 
            type="date" 
            value={archiveDate ?? ''}
            onChange={(e) => setArchiveDate(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-zinc-700 rounded-md p-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          />
          <button 
            onClick={() => {
              setDate(archiveDate);
              setView('pointage');
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md font-bold active:scale-95 transition-transform"
          >
            Go
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 border-b dark:border-zinc-800 pb-2">Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <div className="flex items-center space-x-3">
              {darkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-orange-400" />}
              <div>
                <p className="font-bold text-gray-800 dark:text-zinc-100">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Switch between themes</p>
              </div>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button 
            onClick={shareDailySummary}
            className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-zinc-800 rounded-xl text-emerald-800 dark:text-emerald-400 font-bold active:scale-95 transition-transform border border-emerald-100 dark:border-zinc-700"
          >
            <div className="flex items-center space-x-3">
              <FileText size={20} />
              <span>Share Daily Summary</span>
            </div>
            <Share2 size={18} />
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleExport}
              className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 space-y-2 active:scale-95 transition-transform"
            >
              <Download size={24} className="text-emerald-600" />
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">Backup</span>
            </button>
            <label className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 space-y-2 active:scale-95 transition-transform cursor-pointer">
              <Upload size={24} className="text-emerald-600" />
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">Restore</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          {status && (
            <p className="text-center text-xs font-bold text-emerald-600 animate-pulse">{status}</p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h3 className="font-bold text-gray-700 dark:text-zinc-300 mb-2">App Info</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Version: 1.2.0</p>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Developed for Farm Supervision</p>
      </section>
    </motion.div>
  );
}

function RecolteView({ date, teams, setTeams, requestShare }: { date: string; teams: Team[]; setTeams: React.Dispatch<React.SetStateAction<Team[]>>; requestShare: (text: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const saveTeams = async (updated: Team[]) => {
    setTeams(updated);
    await fetch(`/api/teams?date=${date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const addTeam = () => {
    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      leaderName: '',
      rec: 0,
      deg: 0,
      cap: 0,
      nationality: 'MR',
      date: date
    };
    const updated = [...teams, newTeam];
    saveTeams(updated);
    setExpandedId(newTeam.id);
    
    // Scroll to bottom after state update
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const updateTeam = (id: string, updates: Partial<Team>) => {
    const updated = teams.map(t => t.id === id ? { ...t, ...updates } : t);
    saveTeams(updated);
  };

  const deleteTeam = (id: string) => {
    const updated = teams.filter(t => t.id !== id);
    saveTeams(updated);
  };

  const shareRecolte = () => {
    const dateFormatted = formatDate(date, '-');
    const mrTeams = teams.filter(t => t.nationality === 'MR');
    const ssTeams = teams.filter(t => t.nationality === 'SS');

    const mrTotal = mrTeams.reduce((sum, t) => sum + t.rec + t.deg + t.cap, 0);
    const ssTotal = ssTeams.reduce((sum, t) => sum + t.rec + t.deg + t.cap, 0);

    const ttRec = teams.reduce((sum, t) => sum + t.rec, 0);
    const ttCap = teams.reduce((sum, t) => sum + t.cap, 0);
    const ttDeg = teams.reduce((sum, t) => sum + t.deg, 0);

    let text = `\`QP 07\` • \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n` +
      `* \`LES MAROCAINS : ${mrTotal}\`\n\n`;

    mrTeams.forEach((t, i) => {
      text += `■ *EQ${i + 1} ${t.leaderName}*\n` +
        `   | ${t.rec}Réc | ${t.cap}Cap | ${t.deg}Dég |\n\n`;
    });

    text += `---------------------------------------------\n` +
      `* \`SUB SAHARIENNE : ${ssTotal}\`\n\n`;

    ssTeams.forEach((t, i) => {
      text += `■ *EQ${i + 1} ${t.leaderName}*\n` +
        `   | ${t.rec}Réc | ${t.cap}Cap | ${t.deg}Dég |\n\n`;
    });

    text += `---------------------------------------------\n` +
      `\`TT : ${ttRec}Réc ${ttCap}Cap ${ttDeg}Dég\`\n` +
      `---------------------------------------------`;

    requestShare(text);
  };

  const shareSS = () => {
    const dateFormatted = formatDate(date, '-');
    const ssTeams = teams.filter(t => t.nationality === 'SS');
    const totalSS = ssTeams.reduce((sum, t) => sum + t.rec + t.deg + t.cap, 0);

    let text = `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n` +
      `\`SUB SAHARIENNE :\`\n\n`;

    ssTeams.forEach((t) => {
      const total = t.rec + t.deg + t.cap;
      text += `* ${total} Prs EQ ${t.leaderName} \n`;
    });

    text += `\n---------------------------------------------\n` +
      `\`TOTAL    : ${totalSS} Prs\``;

    requestShare(text);
  };

  return (
    <div className="space-y-4 pb-20" onClick={() => setExpandedId(null)}>
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">Recolte Teams</h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={(e) => { e.stopPropagation(); setExpandedId(team.id === expandedId ? null : team.id); }}
              className={`bg-white dark:bg-zinc-900 rounded-xl shadow-sm border transition-all overflow-hidden ${
                expandedId === team.id ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-gray-100 dark:border-zinc-800'
              }`}
            >
              {expandedId === team.id ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                    <AutocompleteInput 
                      type="leader"
                      label=""
                      value={team.leaderName}
                      onChange={(val) => updateTeam(team.id, { leaderName: val })}
                      placeholder="Leader Name"
                      className="flex-1"
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateTeam(team.id, { nationality: team.nationality === 'MR' ? 'SS' : 'MR' }); }}
                      className={`px-4 py-2 rounded-xl font-bold text-white transition-colors ${
                        team.nationality === 'MR' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {team.nationality}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      className="relative flex items-center bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="pl-3 text-white font-black text-sm">R</span>
                      <input 
                        type="number" 
                        value={team.rec === 0 ? '' : team.rec}
                        placeholder="0"
                        onFocus={handleFocus}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTeam(team.id, { rec: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent p-2 text-right font-black outline-none text-white"
                      />
                    </div>
                    <div 
                      className="relative flex items-center bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="pl-3 text-white font-black text-sm">C</span>
                      <input 
                        type="number" 
                        value={team.cap === 0 ? '' : team.cap}
                        placeholder="0"
                        onFocus={handleFocus}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTeam(team.id, { cap: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent p-2 text-right font-black outline-none text-white"
                      />
                    </div>
                    <div 
                      className="relative flex items-center bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="pl-3 text-white font-black text-sm">D</span>
                      <input 
                        type="number" 
                        value={team.deg === 0 ? '' : team.deg}
                        placeholder="0"
                        onFocus={handleFocus}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTeam(team.id, { deg: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent p-2 text-right font-black outline-none text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => deleteTeam(team.id)}
                      className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${team.nationality === 'MR' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-bold text-gray-800 dark:text-zinc-200">EQ{index + 1} {team.leaderName || '...'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-black">
                    <span className="text-emerald-600">{team.rec}r</span>
                    <span className="text-blue-600">{team.cap}c</span>
                    <span className="text-amber-600">{team.deg}D</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] text-white ${team.nationality === 'MR' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      {team.nationality}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-center pt-4">
        <button 
          onClick={(e) => { e.stopPropagation(); addTeam(); }}
          className="bg-emerald-600 text-white flex items-center space-x-2 px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-transform font-bold"
        >
          <Plus size={20} />
          <span>Add Team</span>
        </button>
      </div>

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button 
            onClick={shareRecolte}
            className="bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
          >
            <Share2 size={18} />
            <span className="text-sm">Sharing Recolte</span>
          </button>
          <button 
            onClick={shareSS}
            className="bg-rose-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
          >
            <Share2 size={18} />
            <span className="text-sm">Sharing SS</span>
          </button>
        </div>
      )}
    </div>
  );
}

function FuelView({ date, fuel, setFuel, requestShare }: { date: string; fuel: FuelInventory; setFuel: React.Dispatch<React.SetStateAction<FuelInventory>>; requestShare: (text: string) => void }) {
  const saveFuel = async (updated: FuelInventory) => {
    setFuel(updated);
    await fetch(`/api/fuel?date=${date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const updateFuel = (updates: Partial<FuelInventory>) => {
    saveFuel({ ...fuel, ...updates });
  };

  const shareFuel = () => {
    const dateFormatted = formatDate(date, '-');
    
    const formatValue = (val: number) => val === 0 ? 'Aucune' : `${val} L`;

    let entreeText = '';
    if (fuel.inEssence === 0 && fuel.inGasoil === 0) {
      entreeText = '> Aucune';
    } else {
      entreeText = `> ESSENCE : ${formatValue(fuel.inEssence)}\n` +
                   `> GASOIL  : ${formatValue(fuel.inGasoil)}`;
    }

    let sortieText = '';
    if (fuel.outEssence === 0 && fuel.outGasoil === 0) {
      sortieText = '> Aucune';
    } else {
      sortieText = `> ESSENCE : ${formatValue(fuel.outEssence)}\n` +
                   `> GASOIL  : ${formatValue(fuel.outGasoil)}`;
    }

    const text = `\`QP 07\`• \`\`\`le ${dateFormatted}\`\`\`\n` +
      `---------------------------------------------\n` +
      `- Entrée :\n` +
      `${entreeText}\n\n` +
      `- Sortie :\n` +
      `${sortieText}\n\n` +
      `- Stock Final :\n` +
      `> ESSENCE : ${formatValue(fuel.stockEssence)}\n` +
      `> GASOIL  : ${formatValue(fuel.stockGasoil)}`;

    requestShare(text);
  };

  return (
    <div className="space-y-4 pb-20">
      <section className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-4 border-b dark:border-zinc-800 pb-2">Fuel Inventory</h2>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Entrée</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Essence</span>
                <input 
                  type="number" 
                  value={fuel.inEssence === 0 ? '' : fuel.inEssence}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ inEssence: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-emerald-600"
                />
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Gasoil</span>
                <input 
                  type="number" 
                  value={fuel.inGasoil === 0 ? '' : fuel.inGasoil}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ inGasoil: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Sortie</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Essence</span>
                <input 
                  type="number" 
                  value={fuel.outEssence === 0 ? '' : fuel.outEssence}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ outEssence: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-rose-600"
                />
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Gasoil</span>
                <input 
                  type="number" 
                  value={fuel.outGasoil === 0 ? '' : fuel.outGasoil}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ outGasoil: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-rose-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t dark:border-zinc-800">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Stock Final</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Essence</span>
                <input 
                  type="number" 
                  value={fuel.stockEssence === 0 ? '' : fuel.stockEssence}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ stockEssence: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-emerald-800 dark:text-emerald-400"
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Gasoil</span>
                <input 
                  type="number" 
                  value={fuel.stockGasoil === 0 ? '' : fuel.stockGasoil}
                  placeholder="0"
                  onFocus={handleFocus}
                  onChange={(e) => updateFuel({ stockGasoil: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent font-black text-xl outline-none text-blue-800 dark:text-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={shareFuel}
          className="w-full mt-8 bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
        >
          <Share2 size={20} />
          <span>sharing fuel</span>
        </button>
      </section>
    </div>
  );
}
