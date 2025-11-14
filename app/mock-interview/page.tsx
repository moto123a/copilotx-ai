'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, CheckCircle, XCircle, Pause, ArrowLeft, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MockInterviewPage() {
  const router = useRouter();
  const [step, setStep] = useState('setup');
  const [isDark, setIsDark] = useState(true);
  const [formData, setFormData] = useState({
    resume: '',
    technology: '',
    jobDescription: '',
    experienceLevel: 'intermediate'
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 30, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 30, damping: 20 });

  const theme = {
    bg: isDark ? 'bg-slate-950' : 'bg-white',
    text: isDark ? 'text-slate-50' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-600',
    card: isDark ? 'from-slate-900/90 to-slate-800/90' : 'from-slate-50 to-slate-100',
    border: isDark ? 'border-slate-800/50' : 'border-slate-200',
    headerBg: isDark ? 'bg-slate-950/80' : 'bg-white/80',
    inputBg: isDark ? 'bg-slate-800/50' : 'bg-slate-100',
    inputBorder: isDark ? 'border-slate-700' : 'border-slate-300',
  };

  useEffect(() => {
    let rafId: number;
    const move = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const cx = e.clientX - window.innerWidth / 2;
        const cy = e.clientY - window.innerHeight / 2;
        x.set(cx / 50);
        y.set(cy / 50);
        rafId = null as any;
      });
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [x, y]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          setTranscript(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      
      if (file.type === 'application/pdf') {
        setFormData({...formData, resume: `Resume uploaded: ${file.name} - Please review the content manually`});
      } else {
        setFormData({...formData, resume: content});
      }
    };
    
    if (file.type === 'application/pdf') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: formData.resume,
          technology: formData.technology,
          experienceLevel: formData.experienceLevel,
          jobDescription: formData.jobDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      const content = data.content.find((item: any) => item.type === 'text')?.text || '';
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const generatedQuestions = JSON.parse(cleanContent);
      
      setQuestions(generatedQuestions);
      setStep('interview');
      
      const intro = `Hello! I'm your AI interviewer today. I'll be asking you ${generatedQuestions.length} questions about ${formData.technology}. Let's begin with the first question: ${generatedQuestions[0].question}`;
      setAiResponse(intro);
      
      if (autoSpeak) {
        setTimeout(() => speakText(intro), 500);
      }
      
      setConversation([{ type: 'ai', text: intro, timestamp: new Date() }]);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processAnswer = async () => {
    if (!transcript.trim()) return;

    stopListening();
    setIsLoading(true);

    const userAnswer = transcript;
    setTranscript('');

    setConversation(prev => [...prev, { type: 'user', text: userAnswer, timestamp: new Date() }]);

    const currentQuestion = questions[currentQuestionIndex].question;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are conducting a mock interview. The candidate just answered a question.

Question: ${currentQuestion}
Candidate's Answer: ${userAnswer}

Respond naturally as an interviewer would:
1. Give brief feedback on their answer (1-2 sentences)
2. ${currentQuestionIndex < questions.length - 1 
  ? `Then ask the next question: ${questions[currentQuestionIndex + 1].question}` 
  : 'Then thank them and say the interview is complete.'}

Keep your response conversational and encouraging.`
          }]
        })
      });

      const data = await response.json();
      const aiText = data.content.find((item: any) => item.type === 'text')?.text || '';
      
      setAiResponse(aiText);
      setConversation(prev => [...prev, { type: 'ai', text: aiText, timestamp: new Date() }]);

      if (autoSpeak) {
        setTimeout(() => speakText(aiText), 500);
      }

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setTimeout(() => generateFinalFeedback(), 3000);
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFinalFeedback = async () => {
    setIsLoading(true);
    const userAnswers = conversation.filter(c => c.type === 'user');
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Analyze this mock interview and provide feedback. Return ONLY valid JSON.

Questions and Answers:
${questions.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${userAnswers[i]?.text || 'No answer'}`).join('\n\n')}

Return: {"overallScore": <1-10>, "strengths": ["point1", "point2", "point3"], "improvements": ["point1", "point2", "point3"], "summary": "brief summary"}`
          }]
        })
      });

      const data = await response.json();
      const content = data.content.find((item: any) => item.type === 'text')?.text || '';
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const feedbackData = JSON.parse(cleanContent);
      
      setFeedback(feedbackData);
      setStep('results');
      
    } catch (error) {
      console.error('Error:', error);
      setFeedback({
        overallScore: 0,
        strengths: ['Unable to generate feedback'],
        improvements: [],
        summary: 'Feedback generation failed'
      });
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`relative flex flex-col min-h-screen font-sans transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none will-change-transform">
        <motion.div 
          animate={{
            background: isDark ? [
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)",
            ] : [
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.12) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />

        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="fixed rounded-full will-change-transform"
            style={{
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              left: `${10 + i * 8}%`,
              top: `${15 + (i % 4) * 20}%`,
              background: i % 4 === 0 
                ? isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.4)'
                : i % 4 === 1
                ? isDark ? 'rgba(168, 85, 247, 0.6)' : 'rgba(168, 85, 247, 0.4)'
                : i % 4 === 2
                ? isDark ? 'rgba(236, 72, 153, 0.6)' : 'rgba(236, 72, 153, 0.4)'
                : isDark ? 'rgba(34, 211, 238, 0.6)' : 'rgba(34, 211, 238, 0.4)',
              boxShadow: isDark ? '0 0 20px currentColor' : '0 0 15px currentColor',
            }}
            animate={{
              y: [0, -150, 0],
              x: [0, Math.sin(i) * 40, 0],
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: 12 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 ${theme.border} border-b ${theme.headerBg} backdrop-blur-xl`}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/')}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <motion.div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-white font-bold text-xl">C</span>
              </motion.div>
              <h1 className="text-xl font-bold tracking-tight">
                CoopilotX <span className="text-blue-400">AI</span>
              </h1>
            </motion.div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
          >
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </motion.button>
        </div>
      </motion.header>

      {/* Setup Step */}
      {step === 'setup' && (
        <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-32 pb-20">
          <div className="max-w-3xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full backdrop-blur-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Voice-Powered Mock Interview
                </span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
                <span className={theme.text}>Practice with</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Interviewer
                </span>
              </h1>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                AI will speak questions, you answer verbally, get instant feedback
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-8 backdrop-blur-xl shadow-2xl`}
            >
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${theme.text}`}>
                    Upload Resume *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <motion.div 
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-8 ${theme.inputBg} border-2 ${theme.inputBorder} border-dashed rounded-xl cursor-pointer hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-3`}
                  >
                    {resumeFile ? (
                      <>
                        <CheckCircle className="w-10 h-10 text-green-400" />
                        <div className="text-center">
                          <p className="font-semibold text-green-400 text-lg">{resumeFile.name}</p>
                          <p className={`text-sm ${theme.textSecondary} mt-1`}>✓ Uploaded successfully • Click to change</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-blue-400" />
                        <div className="text-center">
                          <p className={`font-semibold text-lg ${theme.text}`}>Click to upload your resume</p>
                          <p className={`text-sm ${theme.textSecondary} mt-2`}>Supports PDF, DOC, DOCX, TXT • Max 10MB</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                  
                  <details className="mt-4">
                    <summary className={`text-sm ${theme.textSecondary} cursor-pointer hover:text-blue-400 transition-colors select-none`}>
                      Or type your background manually
                    </summary>
                    <textarea
                      value={formData.resume}
                      onChange={(e) => {
                        setFormData({...formData, resume: e.target.value});
                        setResumeFile(null);
                      }}
                      className={`w-full p-4 mt-3 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.text} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 transition-all text-sm`}
                      placeholder="Describe your skills, experience, and background..."
                    />
                  </details>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                    Technology / Role *
                  </label>
                  <input
                    type="text"
                    value={formData.technology}
                    onChange={(e) => setFormData({...formData, technology: e.target.value})}
                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.text} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                    placeholder="e.g., React Developer, Python, Full Stack..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                    Experience Level
                  </label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})}
                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  >
                    <option value="entry">Entry Level</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>
                    Job Description (Optional)
                  </label>
                  <textarea
                    value={formData.jobDescription}
                    onChange={(e) => setFormData({...formData, jobDescription: e.target.value})}
                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-xl ${theme.text} placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24 transition-all`}
                    placeholder="Paste job description for tailored questions..."
                  />
                </div>

                <motion.button
                  onClick={generateQuestions}
                  disabled={!formData.resume || !formData.technology || isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Voice Interview
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Interview Step */}
      {step === 'interview' && (
        <section className="relative flex flex-col items-center min-h-screen px-6 pt-32 pb-20">
          <div className="max-w-6xl w-full">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className={`flex justify-between text-sm mb-2 ${theme.textSecondary}`}>
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
              </div>
              <div className={`w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-full h-3 overflow-hidden`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-6 backdrop-blur-xl shadow-xl max-h-[600px] overflow-y-auto`}
              >
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme.text}`}>
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Conversation
                </h2>
                <div className="space-y-4">
                  {conversation.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.type === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                          : isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-200 text-slate-900'
                      }`}>
                        <div className="text-xs opacity-70 mb-1 font-semibold">
                          {msg.type === 'user' ? 'You' : 'AI Interviewer'}
                        </div>
                        <div className="text-sm leading-relaxed">{msg.text}</div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-200'} p-4 rounded-2xl`}>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className={`text-sm ${theme.textSecondary}`}>AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-6 backdrop-blur-xl shadow-xl`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${theme.text}`}>
                      <Volume2 className="w-5 h-5 text-blue-400" />
                      AI Interviewer
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAutoSpeak(!autoSpeak)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}
                    >
                      {autoSpeak ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
                    </motion.button>
                  </div>
                  
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 mb-4"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 h-8 bg-green-400 rounded"
                            animate={{ 
                              scaleY: [1, 1.5, 0.5, 1.2, 1],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.1
                            }}
                          />
                        ))}
                      </div>
                      <span className={`text-sm ${theme.textSecondary}`}>AI is speaking...</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={stopSpeaking}
                        className="ml-auto p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      >
                        <Pause className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </motion.div>
                  )}

                  <div className={`p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-xl mb-4`}>
                    <p className={`text-sm ${theme.text} leading-relaxed`}>
                      {aiResponse || 'Waiting for AI response...'}
                    </p>
                  </div>

                  {!autoSpeak && !isSpeaking && aiResponse && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => speakText(aiResponse)}
                      className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-blue-400">Play AI Response</span>
                    </motion.button>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-6 backdrop-blur-xl shadow-xl`}
                >
                  <h3 className={`font-bold flex items-center gap-2 mb-4 ${theme.text}`}>
                    <Mic className="w-5 h-5 text-purple-400" />
                    Your Answer
                  </h3>

                  <div className={`p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-xl mb-4 min-h-[100px]`}>
                    <p className={`text-sm ${transcript ? theme.text : theme.textSecondary}`}>
                      {transcript || 'Click the microphone to start speaking...'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isListening ? stopListening : startListening}
                      disabled={isSpeaking}
                      className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Start Speaking
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={processAnswer}
                      disabled={!transcript.trim() || isLoading || isListening}
                      className="px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Submit
                    </motion.button>
                  </div>

                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 flex items-center justify-center gap-2"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-6 bg-red-500 rounded-full"
                            animate={{ 
                              scaleY: [1, 2, 1],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-red-400">Listening...</span>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results Step */}
      {step === 'results' && feedback && (
        <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-32 pb-20">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 shadow-lg shadow-green-500/50"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                <span className={theme.text}>Interview</span>
                <br />
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Complete!
                </span>
              </h1>
              <p className={`text-lg ${theme.textSecondary}`}>
                Here's your performance analysis
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-8 backdrop-blur-xl shadow-2xl mb-6`}
            >
              <div className="text-center mb-8">
                <div className="text-6xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {feedback.overallScore}/10
                </div>
                <div className={`text-sm ${theme.textSecondary}`}>Overall Score</div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className={`font-bold mb-3 flex items-center gap-2 ${theme.text}`}>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {feedback.strengths.map((strength: string, idx: number) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`text-sm ${theme.textSecondary} pl-4 border-l-2 border-green-500`}
                      >
                        {strength}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className={`font-bold mb-3 flex items-center gap-2 ${theme.text}`}>
                    <XCircle className="w-5 h-5 text-orange-400" />
                    Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {feedback.improvements.map((improvement: string, idx: number) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`text-sm ${theme.textSecondary} pl-4 border-l-2 border-orange-500`}
                      >
                        {improvement}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={`p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-xl`}>
                <h3 className={`font-bold mb-2 ${theme.text}`}>Summary</h3>
                <p className={`text-sm ${theme.textSecondary} leading-relaxed`}>
                  {feedback.summary}
                </p>
              </div>
            </motion.div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setStep('setup');
                  setConversation([]);
                  setQuestions([]);
                  setCurrentQuestionIndex(0);
                  setTranscript('');
                  setFeedback(null);
                  setAiResponse('');
                  setResumeFile(null);
                  setFormData({
                    resume: '',
                    technology: '',
                    jobDescription: '',
                    experienceLevel: 'intermediate'
                  });
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
              >
                Start New Interview
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/')}
                className={`flex-1 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'} ${theme.text} py-4 rounded-xl font-semibold transition-all`}
              >
                Back to Home
              </motion.button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}