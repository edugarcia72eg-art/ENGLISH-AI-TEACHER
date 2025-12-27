
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLiveAPI } from './hooks/useLiveAPI';
import { LogMessage, ConnectionState, SavedVocabulary, SessionMode, User, UserStats, TeacherProfile, EnglishLevel, DailyGoals, SessionSummary } from './types';
import { Visualizer } from './components/Visualizer';
import { ControlBar } from './components/ControlBar';
import { ChatLog } from './components/ChatLog';

type PhonemeCategory = 'Vowels' | 'Consonants' | 'Diphthongs' | 'Clusters';

interface PhonemeItem {
  label: string;
  phoneme: string;
  example: string;
  command: string;
  category: PhonemeCategory;
}

const PHONEME_PRACTICE_ITEMS: PhonemeItem[] = [
  { label: 'TH (Unvoiced)', phoneme: '/θ/', example: 'Three, Healthy, Earth', category: 'Consonants', command: 'unvoiced "th" /θ/' },
  { label: 'TH (Voiced)', phoneme: '/ð/', example: 'That, Weather, Smooth', category: 'Consonants', command: 'voiced "th" /ð/' },
  { label: 'TH Mastery', phoneme: '/θ/ & /ð/', example: 'Think vs. These', category: 'Consonants', command: 'comprehensive practice of both voiced and unvoiced "th" sounds (/θ/ and /ð/)' },
  { label: 'R vs L', phoneme: '/r/ vs /l/', example: 'Read, Lead', category: 'Consonants', command: 'distinction between /r/ and /l/' },
  { label: 'V vs B', phoneme: '/v/ vs /b/', example: 'Very, Berry', category: 'Consonants', command: 'distinction between /v/ and /b/' },
  { label: 'S vs SH', phoneme: '/s/ vs /ʃ/', example: 'Sea, She', category: 'Consonants', command: '/s/ and /ʃ/ sounds' },
  { label: 'W vs V', phoneme: '/w/ vs /v/', example: 'Wet, Vet', category: 'Consonants', command: 'distinction between the /w/ and /v/ sounds' },
  { label: 'CH vs SH', phoneme: '/tʃ/ vs /ʃ/', example: 'Chair, Share', category: 'Consonants', command: 'distinction between the /tʃ/ and /ʃ/ sounds' },
  { label: 'Z vs S', phoneme: '/z/ vs /s/', example: 'Zip, Sip', category: 'Consonants', command: 'voiced /z/ and unvoiced /s/' },
  { label: 'NG Sound', phoneme: '/ŋ/', example: 'Sing, Long', category: 'Consonants', command: 'velar nasal /ŋ/ sound' },
  { label: 'ZH Sound', phoneme: '/ʒ/', example: 'Measure, Vision', category: 'Consonants', command: 'voiced /ʒ/ sound' },
  { label: 'Sheep vs Ship', phoneme: '/i:/ vs /ɪ/', example: 'Sheet, Sit', category: 'Vowels', command: 'long /i:/ and short /ɪ/ vowel sounds' },
  { label: 'Bad vs Bed', phoneme: '/æ/ vs /e/', example: 'Bad, Bed', category: 'Vowels', command: 'difference between the /æ/ and /e/ vowel sounds' },
  { label: 'Foot vs Food', phoneme: '/ʊ/ vs /u:/', example: 'Foot, Food', category: 'Vowels', command: 'short /ʊ/ and long /u:/ vowel sounds' },
  { label: 'Caught vs Cot', phoneme: '/ɔ:/ vs /ɒ/', example: 'Caught, Cot', category: 'Vowels', command: 'difference between /ɔ:/ and /ɒ/ vowels' },
  { label: 'Diphthong AY', phoneme: '/eɪ/', example: 'Face, Day', category: 'Diphthongs', command: '/eɪ/ diphthong' },
  { label: 'Diphthong AI', phoneme: '/aɪ/', example: 'Price, Sky', category: 'Diphthongs', command: '/aɪ/ diphthong' },
  { label: 'Diphthong OW', phoneme: '/əʊ/', example: 'Go, Home', category: 'Diphthongs', command: '/əʊ/ diphthong' },
  { label: 'Diphthong AIR', phoneme: '/eə/', example: 'Square, Chair', category: 'Diphthongs', command: '/eə/ diphthong' },
  { label: 'Diphthong EAR', phoneme: '/ɪə/', example: 'Near, Clear', category: 'Diphthongs', command: '/ɪə/ diphthong' },
  { label: 'Diphthong OY', phoneme: '/ɔɪ/', example: 'Boy, Coin', category: 'Diphthongs', command: '/ɔɪ/ diphthong' },
  { label: 'Diphthong OU', phoneme: '/aʊ/', example: 'Mouth, Cloud', category: 'Diphthongs', command: '/aʊ/ diphthong' },
  { label: 'STR Cluster', phoneme: '/str/', example: 'Street, Strong', category: 'Clusters', command: '/str/ consonant cluster' },
  { label: 'THR Cluster', phoneme: '/θr/', example: 'Three, Through', category: 'Clusters', command: '/θr/ consonant cluster' },
  { label: 'Ending STS', phoneme: '/sts/', example: 'Lists, Ghosts', category: 'Clusters', command: '/sts/ consonant cluster' },
  { label: 'SPL Cluster', phoneme: '/spl/', example: 'Splash, Split', category: 'Clusters', command: '/spl/ consonant cluster' },
  { label: 'SCR Cluster', phoneme: '/scr/', example: 'Screen, Scratch', category: 'Clusters', command: '/scr/ consonant cluster' },
  { label: 'TR vs DR', phoneme: '/tr/ vs /dr/', example: 'Train, Drain', category: 'Clusters', command: 'distinction between /tr/ and /dr/ clusters' },
  { label: 'FT Ending', phoneme: '/ft/', example: 'Soft, Gift', category: 'Clusters', command: '/ft/ cluster at the end of words' },
];

const TEACHERS: TeacherProfile[] = [
  { id: 'sophia', name: 'Sophia Victoria', title: 'Fluency Specialist', voice: 'Kore', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&gender=female', description: 'Warm and encouraging.' },
  { id: 'sebas', name: 'Super Sebas', title: 'High-Energy Coach', voice: 'Fenrir', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sebas&gender=male', description: 'Dynamic and direct.' }
];

const PROFICIENCY_LEVELS: { id: EnglishLevel; name: string; desc: string; color: string; focus: string }[] = [
  { id: 'A1', name: 'Beginner', desc: 'Starting your journey.', color: 'border-orange-500 text-orange-400', focus: 'Basic greetings & common nouns' },
  { id: 'A2', name: 'Elementary', desc: 'Handling simple tasks.', color: 'border-yellow-500 text-yellow-400', focus: 'Daily routines & past events' },
  { id: 'B1', name: 'Intermediate', desc: 'Getting independent.', color: 'border-green-500 text-green-400', focus: 'Opinions & hypothetical situations' },
  { id: 'B2', name: 'Upper Int.', desc: 'Communicating fluently.', color: 'border-cyan-500 text-cyan-400', focus: 'Complex arguments & technical talk' },
  { id: 'C1', name: 'Advanced', desc: 'Near native proficiency.', color: 'border-purple-500 text-purple-400', focus: 'Nuance, sarcasm & academic topics' },
  { id: 'C2', name: 'Mastery', desc: 'Ultimate fluency.', color: 'border-pink-500 text-pink-400', focus: 'Literary analysis & total ease' },
];

const DEFAULT_STATS: UserStats = {
  streak: 0, lastActiveDate: '', totalMinutes: 0, dailyMinutes: 0,
  modeXP: { conversation: 0, pronunciation: 0, writing: 0, roleplay: 0 },
  phonemeMastery: {},
  sessionHistory: [],
};

const DEFAULT_GOALS: DailyGoals = { minutes: 15, vocab: 5 };

const ROLEPLAY_SCENARIOS = [
  { title: 'Job Interview', description: 'Practice answering questions.', icon: '💼', command: 'I want to roleplay a job interview. You are the hiring manager.' },
  { title: 'Doctor Visit', description: 'Explain symptoms.', icon: '🩺', command: 'I want to roleplay a visit to the doctor. You are the doctor.' },
  { title: 'Airport Security', description: 'Navigate travel checks.', icon: '✈️', command: 'I want to roleplay going through airport security. You are the officer.' },
];

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const active = localStorage.getItem('fluent_ai_active_user');
    return active ? JSON.parse(active) : null;
  });
  const [activeTab, setActiveTab] = useState<'transcript' | 'vocabulary' | 'progress'>('transcript');
  const [sessionMode, setSessionMode] = useState<SessionMode>('conversation');
  const [selectedPhonemes, setSelectedPhonemes] = useState<string[]>([]);
  const [loginName, setLoginName] = useState('');
  const [loginLevel, setLoginLevel] = useState<EnglishLevel>('B1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<'sophia' | 'sebas'>(currentUser?.preferredTeacherId || 'sophia');
  const [lastPace, setLastPace] = useState<LogMessage['paceDetail'] | null>(null);
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [writingInput, setWritingInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const currentSessionStartTimeRef = useRef<number | null>(null);
  const sessionMessagesRef = useRef<LogMessage[]>([]);

  const handleMessage = useCallback((message: LogMessage) => {
    if (message.type === 'pace' && message.paceDetail) setLastPace(message.paceDetail);
    setMessages(prev => [...prev, message]);
    sessionMessagesRef.current.push(message);
  }, []);

  const { connectionState, isMicOn, isCamOn, volume, connect, disconnect, toggleMic, toggleCam, changeMode, sendText } = useLiveAPI({ 
    onMessage: handleMessage, videoRef, teacherId: selectedTeacherId, proficiencyLevel: currentUser?.proficiencyLevel || loginLevel
  });

  const saveUserData = useCallback((user: User) => {
    const storedUsers = JSON.parse(localStorage.getItem('fluent_ai_users_directory') || '{}');
    storedUsers[user.id] = user;
    localStorage.setItem('fluent_ai_users_directory', JSON.stringify(storedUsers));
    localStorage.setItem('fluent_ai_active_user', JSON.stringify(user));
  }, []);

  const updateUserStats = useCallback((updates: Partial<UserStats>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, stats: { ...currentUser.stats, ...updates } };
    setCurrentUser(updatedUser);
    saveUserData(updatedUser);
  }, [currentUser, saveUserData]);

  const updateUserProfile = useCallback((updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    saveUserData(updatedUser);
    // If level or teacher changed, we might want to suggest reconnecting
  }, [currentUser, saveUserData]);

  const summarizeSession = useCallback(async () => {
    if (!currentUser || sessionMessagesRef.current.length < 3 || isSummarizing) return;
    
    setIsSummarizing(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const duration = currentSessionStartTimeRef.current ? Math.round((Date.now() - currentSessionStartTimeRef.current) / 60000) : 0;
    
    const transcriptText = sessionMessagesRef.current
      .map(m => `${m.role === 'user' ? 'Student' : 'Teacher'}: ${m.text}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this English learning session and provide a structured summary in JSON format.
        Session Mode: ${sessionMode}
        Transcript:
        ${transcriptText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
              notableCorrections: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["keyTakeaways", "improvementAreas", "notableCorrections"],
          }
        }
      });

      const summaryData = JSON.parse(response.text || '{}');
      const newSummary: SessionSummary = {
        id: crypto.randomUUID(),
        mode: sessionMode,
        timestamp: new Date(),
        durationMinutes: duration,
        teacherName: TEACHERS.find(t => t.id === selectedTeacherId)?.name || 'Teacher',
        ...summaryData
      };

      updateUserStats({
        sessionHistory: [newSummary, ...currentUser.stats.sessionHistory].slice(0, 50),
        totalMinutes: currentUser.stats.totalMinutes + duration,
        dailyMinutes: currentUser.stats.dailyMinutes + duration,
      });

      // Clear current session cache
      sessionMessagesRef.current = [];
      currentSessionStartTimeRef.current = null;
    } catch (e) {
      console.error("Failed to summarize session", e);
    } finally {
      setIsSummarizing(false);
    }
  }, [currentUser, isSummarizing, sessionMode, selectedTeacherId, updateUserStats]);

  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED) {
      if (!currentSessionStartTimeRef.current) {
        currentSessionStartTimeRef.current = Date.now();
        sessionMessagesRef.current = [];
      }
    } else if (connectionState === ConnectionState.DISCONNECTED) {
      if (currentSessionStartTimeRef.current && sessionMessagesRef.current.length > 0) {
        summarizeSession();
      }
    }
  }, [connectionState, summarizeSession]);

  const handleModeChange = (newMode: SessionMode) => {
    if (connectionState === ConnectionState.CONNECTED) {
      summarizeSession();
    }
    setSessionMode(newMode);
    if (connectionState === ConnectionState.CONNECTED) {
      changeMode(newMode);
    } else {
      connect(newMode);
    }
  };

  const handleLearnMore = (correctionText: string) => {
    const command = `The student wants to learn more about this correction: "${correctionText}". Please explain the grammar rule in detail.`;
    if (connectionState === ConnectionState.CONNECTED) {
      sendText(command);
    } else {
      connect(sessionMode, command);
    }
  };

  const startTargetedPhonemeSession = () => {
    const items = PHONEME_PRACTICE_ITEMS.filter(item => selectedPhonemes.includes(item.label));
    const command = `I want to practice these specific sounds: ${items.map(i => i.command).join(', ')}`;
    if (connectionState === ConnectionState.CONNECTED) {
        changeMode('pronunciation');
        sendText(command);
    } else {
        connect('pronunciation', command);
    }
    setSelectedPhonemes([]);
  };

  const startRoleplayScenario = (command: string) => {
    if (connectionState === ConnectionState.CONNECTED) {
        changeMode('roleplay');
        sendText(command);
    } else {
        connect('roleplay', command);
    }
  };

  const submitWriting = () => {
    if (!writingInput.trim()) return;
    const command = `The student has submitted the following text for your critique and feedback: "${writingInput}". Please provide "Written Feedback:" and a "Grammar Insight:" correction.`;
    if (connectionState === ConnectionState.CONNECTED) {
        sendText(command);
    } else {
        connect('writing', command);
    }
    setWritingInput('');
  };

  const activeTeacher = TEACHERS.find(t => t.id === selectedTeacherId) || TEACHERS[0];
  const currentLevelInfo = PROFICIENCY_LEVELS.find(l => l.id === (currentUser?.proficiencyLevel || loginLevel));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-[2.5rem] p-12 shadow-2xl space-y-12 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black tracking-tighter">Fluent<span className="text-cyan-400">AI</span></h1>
              <p className="text-slate-400 font-medium">Your personal real-time English immersion environment.</p>
            </div>

            <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!loginName.trim()) return;
                const newUser: User = { 
                  id: crypto.randomUUID(), 
                  name: loginName, 
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginName}`, 
                  createdAt: new Date(), 
                  stats: DEFAULT_STATS, 
                  proficiencyLevel: loginLevel, 
                  dailyGoals: DEFAULT_GOALS,
                  preferredTeacherId: selectedTeacherId
                };
                setCurrentUser(newUser);
                saveUserData(newUser);
              }} className="space-y-12">
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">Your Name</label>
                  <input 
                    type="text" 
                    value={loginName} 
                    onChange={(e) => setLoginName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-xl focus:outline-none focus:border-cyan-500 transition-all font-bold placeholder:text-slate-600" 
                    required 
                  />
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block text-center">Select Your Level</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {PROFICIENCY_LEVELS.map(level => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setLoginLevel(level.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                          loginLevel === level.id 
                            ? `${level.color} bg-slate-900 shadow-lg scale-105` 
                            : 'border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl font-black">{level.id}</span>
                        <span className="text-[9px] font-bold mt-1 whitespace-nowrap">{level.name}</span>
                      </button>
                    ))}
                  </div>
                  {loginLevel && (
                    <p className="text-center text-xs text-slate-400 italic">
                      {PROFICIENCY_LEVELS.find(l => l.id === loginLevel)?.desc} Focus: {PROFICIENCY_LEVELS.find(l => l.id === loginLevel)?.focus}
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block text-center">Choose Your Tutor</label>
                  <div className="grid grid-cols-2 gap-6">
                    {TEACHERS.map(teacher => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => setSelectedTeacherId(teacher.id)}
                        className={`flex items-center gap-4 p-6 rounded-3xl border-2 transition-all ${
                          selectedTeacherId === teacher.id 
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg scale-105' 
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <img src={teacher.avatar} className="w-16 h-16 rounded-full border-2 border-slate-700" alt={teacher.name} />
                        <div className="text-left">
                          <h4 className="font-bold">{teacher.name}</h4>
                          <p className="text-[10px] text-slate-400">{teacher.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 py-6 rounded-3xl font-black text-xl shadow-xl shadow-cyan-900/20 transition-all hover:scale-[1.02] active:scale-95">
                  Begin Learning Experience
                </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="w-full max-w-5xl flex items-center justify-between mb-8 bg-slate-800 p-4 rounded-3xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-black tracking-tighter cursor-default">Fluent<span className="text-cyan-400">AI</span></div>
          <div className="h-6 w-[1px] bg-slate-700 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${currentLevelInfo?.color}`}>
              {currentUser.proficiencyLevel} {currentLevelInfo?.name}
            </div>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-600 text-slate-400`}>
              {sessionMode}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
            {isSummarizing && <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div><span className="text-[10px] text-cyan-400 font-black uppercase">Analyzing...</span></div>}
            <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-700">
                <div className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                <span className="text-[10px] uppercase font-black text-slate-400">{connectionState}</span>
            </div>
            <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="Profile" />
        </div>
      </header>

      <div className="w-full max-w-5xl flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
        <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 bg-slate-800 rounded-[2.5rem] border border-slate-700 relative flex flex-col items-center justify-center p-8 overflow-hidden shadow-2xl">
                <div className="flex items-center gap-10 mb-8 z-10">
                    <div className="relative">
                      <img src={activeTeacher.avatar} className={`w-32 h-32 rounded-full border-4 transition-all duration-500 ${connectionState === ConnectionState.CONNECTED ? 'border-cyan-400 scale-110' : 'border-slate-600 scale-100 opacity-60'}`} alt={activeTeacher.name} />
                      {connectionState === ConnectionState.CONNECTED && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-900 text-[8px] font-black uppercase px-2 py-1 rounded-full">Active</div>}
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tight">{activeTeacher.name}</h2>
                        <p className="text-cyan-400 uppercase text-xs font-black tracking-[0.2em]">{activeTeacher.title}</p>
                    </div>
                </div>
                
                <div className="w-full max-w-md">
                   <Visualizer volume={volume} isActive={connectionState === ConnectionState.CONNECTED} />
                </div>
                
                {sessionMode === 'roleplay' && connectionState === ConnectionState.CONNECTED && (
                    <div className="grid grid-cols-3 gap-4 mt-8 w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                        {ROLEPLAY_SCENARIOS.map(s => (
                            <button key={s.title} onClick={() => startRoleplayScenario(s.command)} className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-700 hover:border-emerald-500 transition-all text-left group">
                                <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-300">{s.icon}</div>
                                <div className="font-bold text-sm mb-1">{s.title}</div>
                                <div className="text-[10px] text-slate-500 line-clamp-2">{s.description}</div>
                            </button>
                        ))}
                    </div>
                )}

                {sessionMode === 'writing' && connectionState === ConnectionState.CONNECTED && (
                    <div className="w-full max-w-2xl mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500 z-10">
                        <div className="bg-slate-900/60 border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
                            <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-6">Writing Environment</h3>
                            <textarea
                                value={writingInput}
                                onChange={(e) => setWritingInput(e.target.value)}
                                placeholder="Start writing something... Sophia will check your grammar and style."
                                className="w-full h-48 bg-slate-800/40 border border-slate-700 rounded-3xl p-6 text-white focus:outline-none focus:border-amber-500 transition-all resize-none placeholder:text-slate-600 text-lg leading-relaxed shadow-inner"
                            />
                            <div className="flex justify-between items-center mt-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{writingInput.length} characters</span>
                                </div>
                                <button
                                    onClick={submitWriting}
                                    disabled={!writingInput.trim()}
                                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-900 font-black px-10 py-4 rounded-2xl text-sm uppercase transition-all shadow-xl shadow-amber-900/20 hover:scale-105 active:scale-95"
                                >
                                    Get Expert Feedback
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <video ref={videoRef} autoPlay playsInline muted className={`absolute top-4 right-4 w-56 rounded-3xl border-2 border-slate-700 shadow-2xl transition-all ${isCamOn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'}`} />
            </div>
            <ControlBar connectionState={connectionState} isMicOn={isMicOn} isCamOn={isCamOn} onConnect={() => connect(sessionMode)} onDisconnect={disconnect} onToggleMic={toggleMic} onToggleCam={toggleCam} mode={sessionMode} onToggleMode={handleModeChange} />
        </div>
        
        <div className="w-full md:w-[400px] bg-slate-800 rounded-[2.5rem] border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex p-2 bg-slate-900/50">
                <button onClick={() => setActiveTab('transcript')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Session Log</button>
                <button onClick={() => setActiveTab('progress')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'progress' ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Growth Hub</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'transcript' ? (
                    <ChatLog messages={messages} activeTeacherName={activeTeacher.name} onLearnMore={handleLearnMore} />
                ) : (
                    <div className="absolute inset-0 overflow-y-auto p-8 scrollbar-hide space-y-10">
                        {/* Profile Settings Section */}
                        <div className="space-y-6">
                           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Proficiency Level</h3>
                           <div className="grid grid-cols-3 gap-2">
                             {PROFICIENCY_LEVELS.map(level => (
                               <button 
                                key={level.id}
                                onClick={() => updateUserProfile({ proficiencyLevel: level.id })}
                                className={`py-3 rounded-xl border-2 font-black transition-all ${
                                  currentUser.proficiencyLevel === level.id 
                                    ? `${level.color} bg-slate-900` 
                                    : 'border-slate-700 text-slate-600 hover:border-slate-600'
                                }`}
                               >
                                 {level.id}
                               </button>
                             ))}
                           </div>
                           <p className="text-[10px] text-slate-500 italic text-center">Changing level will affect subsequent teacher responses.</p>
                        </div>

                        {/* Stats Section */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">Immersion Time</span>
                             <div className="text-2xl font-black">{currentUser.stats.totalMinutes} <span className="text-xs text-slate-500">MIN</span></div>
                           </div>
                           <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">Learning Streak</span>
                             <div className="text-2xl font-black">{currentUser.stats.streak} <span className="text-xs text-slate-500">DAYS</span></div>
                           </div>
                        </div>

                        {/* Recent History */}
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance Reports</h3>
                          {currentUser.stats.sessionHistory.length === 0 ? (
                            <div className="text-center text-slate-600 py-16 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700">
                              <div className="text-3xl mb-3 opacity-20">📊</div>
                              <p className="text-xs">Complete a 1:1 session to generate your first growth report.</p>
                            </div>
                          ) : (
                            currentUser.stats.sessionHistory.map(session => (
                              <div key={session.id} className="bg-slate-900/50 border border-slate-700 rounded-3xl p-6 space-y-4 hover:border-slate-500 transition-all group">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                                      session.mode === 'pronunciation' ? 'bg-purple-500/20 text-purple-400' :
                                      session.mode === 'roleplay' ? 'bg-emerald-500/20 text-emerald-400' :
                                      session.mode === 'writing' ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-cyan-500/20 text-cyan-400'
                                    }`}>
                                      {session.mode}
                                    </span>
                                    <h4 className="text-sm font-bold mt-2">{new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</h4>
                                  </div>
                                  <span className="text-[9px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{session.durationMinutes}m duration</span>
                                </div>
                                
                                <div className="grid gap-4">
                                  <div>
                                    <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Insights</h5>
                                    <ul className="space-y-1.5">
                                      {session.keyTakeaways.slice(0, 2).map((item, i) => (
                                        <li key={i} className="text-[11px] text-slate-300 flex gap-2">
                                          <span className="text-cyan-500">→</span> {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="pt-2 border-t border-slate-700/50">
                                    <h5 className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-2">Focus Next</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {session.improvementAreas.map((area, i) => (
                                        <span key={i} className="text-[9px] bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/20">{area}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
