import { ArrowRight, Upload, Zap, Code, Database, Cpu, Terminal, Braces } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// Animated code block component
const CodeBlock = ({ children }: { children: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 rounded-md p-4 text-left overflow-hidden relative"
    >
      <div className="flex items-center mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
      </div>
      <pre className="text-blue-400 font-mono text-sm">
        <code>{children}</code>
      </pre>
      <motion.div 
        className="absolute bottom-0 left-0 h-1 bg-blue-500" 
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
      />
    </motion.div>
  );
};

// Floating tech icon component
const FloatingIcon = ({ icon: Icon, delay = 0, x = 0, y = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: [0.4, 1, 0.4], 
        y: [y, y - 15, y],
        x: [x, x + 5, x]
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity, 
        repeatType: 'reverse',
        delay 
      }}
      className="absolute text-blue-400/30"
      style={{ left: `${30 + x}%`, top: `${20 + y}%` }}
    >
      <Icon size={40} />
    </motion.div>
  );
};

// Particle effect component
const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-500/20"
          style={{
            width: Math.random() * 6 + 2 + 'px',
            height: Math.random() * 6 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, -Math.random() * 100 - 50],
            x: [0, (Math.random() - 0.5) * 50],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5
          }}
        />
      ))}
    </div>
  );
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Set loading state to false after a timeout to ensure UI is displayed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 text-white relative overflow-hidden">
      {/* Particle background effect */}
      <ParticleBackground />
      
      {/* Floating tech icons */}
      <FloatingIcon icon={Code} x={-15} y={10} delay={0.5} />
      <FloatingIcon icon={Braces} x={10} y={30} delay={1.2} />
      <FloatingIcon icon={Terminal} x={-10} y={50} delay={0.8} />
      <FloatingIcon icon={Database} x={20} y={70} delay={1.5} />
      <FloatingIcon icon={Cpu} x={-20} y={80} delay={0.3} />
      
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0 opacity-30">
        <motion.div 
          className="absolute inset-0 bg-gradient-radial from-blue-500/20 to-transparent"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          style={{ transformOrigin: 'center' }}
        />
      </div>
      
      {/* Grid lines background */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: 'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              <motion.div 
                className="text-5xl sm:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
                animate={{ filter: 'hue-rotate(360deg)' }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                CodeInsight
              </motion.div>
              <motion.div 
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0, left: '50%' }}
                animate={{ width: '100%', left: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl sm:text-5xl font-bold mb-6"
          >
            Analyze Your Code with
            <motion.span 
              className="text-blue-400 ml-2"
              animate={{ 
                textShadow: "0 0 8px rgba(59, 130, 246, 0.8)"
              }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 1.5 
              }}
            >
              AI Precision
            </motion.span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            Upload your codebase and get instant insights, documentation, and explanations powered by advanced AI.
          </motion.p>
          
          {/* Code snippet display */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mb-12 max-w-2xl mx-auto"
          >
            <CodeBlock>
{`// CodeInsight AI Analysis
function analyzeCode(codebase) {
  const insights = AI.process(codebase);
  return {
    documentation: insights.generateDocs(),
    patterns: insights.findPatterns(),
    suggestions: insights.optimize()
  };
}`}
            </CodeBlock>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.div 
              whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }} 
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-lg"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-80"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
              />
              <Link 
                to="/setup"
                className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg flex items-center space-x-2 transition-colors relative z-10"
              >
                <ArrowRight className="h-5 w-5" />
                <span>Get Started</span>
              </Link>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-lg"
            >
              <button className="bg-gray-800 hover:bg-gray-700 px-8 py-3 rounded-lg flex items-center space-x-2 transition-colors border border-gray-700 relative z-10">
                <Zap className="h-5 w-5" />
                <span>View Demo</span>
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="grid md:grid-cols-3 gap-8 text-left"
          >
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)' }}
              className="bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-700 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Zap className="h-12 w-12 text-blue-400 mb-4 relative z-10" />
              <h3 className="text-xl font-semibold mb-2 relative z-10">Instant Analysis</h3>
              <p className="text-gray-400 relative z-10">Get immediate insights about your code structure, patterns, and potential improvements.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)' }}
              className="bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-700 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Upload className="h-12 w-12 text-blue-400 mb-4 relative z-10" />
              <h3 className="text-xl font-semibold mb-2 relative z-10">Easy Upload</h3>
              <p className="text-gray-400 relative z-10">Simply drag and drop your codebase or select files to start the analysis process.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)' }}
              className="bg-gray-800/50 backdrop-blur-md p-6 rounded-xl border border-gray-700 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <ArrowRight className="h-12 w-12 text-blue-400 mb-4 relative z-10" />
              <h3 className="text-xl font-semibold mb-2 relative z-10">Clear Results</h3>
              <p className="text-gray-400 relative z-10">Receive detailed reports and actionable insights in an easy-to-understand format.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}