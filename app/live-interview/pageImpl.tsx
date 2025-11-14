"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Bot, User, Sparkles } from "lucide-react";

export default function LiveInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isDark, setIsDark] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversation, setConversation] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const theme = {
    bg: isDark ? 'bg-slate-950' : 'bg-white',
    text: isDark ? 'text-slate-50' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-600',
    card: isDark ? 'from-slate-900/90 to-slate-800/90' : 'from-slate-50 to-slate-100',
    border: isDark ? 'border-slate-800/50' : 'border-slate-200',
    headerBg: isDark ? 'bg-slate-950/80' : 'bg-white/80',
  };

  // Get interview details from URL params
  const technology = searchParams.get('technology') || 'General';
  const level = searchParams.get('level') || 'Intermediate';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Speech Recognition Setup
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setTranscript(transcript);
          handleUserResponse(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      // Speech Synthesis Setup
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

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    return new Promise<void>((resolve) => {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      synthRef.current.speak(utterance);
    });
  };

  const startInterview = async () => {
    setInterviewStarted(true);
    const greeting = `Hello! I'm your AI interviewer today. I'll be conducting a ${level} level interview for ${technology}. Are you ready to begin?`;
    
    setConversation([{ 
      type: 'ai', 
      text: greeting, 
      timestamp: new Date() 
    }]);
    
    await speakText(greeting);
    startListening();
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      setTranscript('');
      setCurrentMessage('');
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

  const handleUserResponse = async (userText: string) => {
    stopListening();
    setIsProcessing(true);

    // Add user message to conversation
    setConversation(prev => [...prev, { 
      type: 'user', 
      text: userText, 
      timestamp: new Date() 
    }]);

    try {
      // Call API to get AI response
      const response = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userText,
          conversationHistory: conversation,
          technology,
          level
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const aiText = data.content.find((item: any) => item.type === 'text')?.text || '';

      // Add AI response to conversation
      setConversation(prev => [...prev, { 
        type: 'ai', 
        text: aiText, 
        timestamp: new Date() 
      }]);

      // Speak the AI response
      await speakText(aiText);
      
      // Auto-start listening for next response
      setTimeout(() => {
        startListening();
      }, 500);

    } catch (error) {
      console.error('Error:', error);
      const errorMsg = "I apologize, I'm having trouble processing that. Could you please repeat?";
      setConversation(prev => [...prev, { 
        type: 'ai', 
        text: errorMsg, 
        timestamp: new Date() 
      }]);
      await speakText(errorMsg);
      startListening();
    } finally {
      setIsProcessing(false);
    }
  };

  const endInterview = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    router.push('/mock-interview');
  };

  return (
    <main className={`relative flex flex-col min-h-screen font-sans transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            background: isDark ? [
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
            ] : [
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
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
              onClick={endInterview}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            
            <div>
              <h1 className="text-lg font-bold">Live AI Interview</h1>
              <p className={`text-xs ${theme.textSecondary}`}>{technology} • {level}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSpeaking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 h-3 bg-green-400 rounded-full"
                      animate={{ scaleY: [1, 1.5, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-xs text-green-400 font-medium">AI Speaking</span>
              </div>
            )}

            {isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 h-3 bg-red-400 rounded-full"
                      animate={{ scaleY: [1, 1.8, 1] }}
                      transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-xs text-red-400 font-medium">Listening</span>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <section className="relative flex flex-col flex-1 pt-24 pb-8 px-6">
        <div className="max-w-4xl w-full mx-auto flex flex-col flex-1">
          
          {!interviewStarted ? (
            /* Start Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 mb-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50"
              >
                <Bot className="w-16 h-16 text-white" />
              </motion.div>

              <h1 className="text-4xl font-black mb-4 text-center">
                Ready to Start?
              </h1>
              <p className={`text-lg ${theme.textSecondary} mb-8 text-center max-w-lg`}>
                Click below to begin your AI-powered voice interview. The AI will ask you questions and you'll respond verbally.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startInterview}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/30 flex items-center gap-3"
              >
                <Sparkles className="w-6 h-6" />
                Start Interview
              </motion.button>
            </motion.div>
          ) : (
            /* Interview Screen */
            <>
              {/* Conversation Area */}
              <div className={`flex-1 bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-6 backdrop-blur-xl shadow-xl overflow-y-auto mb-6`}>
                <div className="space-y-4">
                  {conversation.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          msg.type === 'user' 
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                            : 'bg-gradient-to-br from-green-500 to-emerald-600'
                        }`}>
                          {msg.type === 'user' ? (
                            <User className="w-5 h-5 text-white" />
                          ) : (
                            <Bot className="w-5 h-5 text-white" />
                          )}
                        </div>
                        
                        <div className={`p-4 rounded-2xl ${
                          msg.type === 'user' 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                            : isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-200 text-slate-900'
                        }`}>
                          <div className="text-xs opacity-70 mb-1 font-semibold">
                            {msg.type === 'user' ? 'You' : 'AI Interviewer'}
                          </div>
                          <div className="text-sm leading-relaxed">{msg.text}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-200'} p-4 rounded-2xl`}>
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className={`text-sm ${theme.textSecondary}`}>AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={conversationEndRef} />
                </div>
              </div>

              {/* Control Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-br ${theme.card} border ${theme.border} rounded-2xl p-6 backdrop-blur-xl shadow-xl`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Mic className={`w-5 h-5 ${isListening ? 'text-red-400' : theme.textSecondary}`} />
                    <div>
                      <p className={`text-sm font-semibold ${theme.text}`}>
                        {isListening ? 'Listening to your answer...' : 'Click microphone to speak'}
                      </p>
                      {currentMessage && (
                        <p className={`text-xs ${theme.textSecondary} mt-1`}>{currentMessage}</p>
                      )}
                    </div>
                  </div>
                </div>

                {transcript && (
                  <div className={`mb-4 p-3 ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} rounded-lg`}>
                    <p className={`text-sm ${theme.text}`}>{transcript}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isListening ? stopListening : startListening}
                    disabled={isSpeaking || isProcessing}
                    className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30'
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
                    onClick={endInterview}
                    className={`px-6 py-4 rounded-xl font-semibold ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'} transition-all`}
                  >
                    End Interview
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}