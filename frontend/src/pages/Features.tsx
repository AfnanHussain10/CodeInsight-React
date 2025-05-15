import { Brain, Code, GitBranch, Search, Shield, Zap } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-blue-400" />,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze your code structure and patterns."
    },
    {
      icon: <Search className="h-8 w-8 text-blue-400" />,
      title: "Smart Search",
      description: "Quickly find and navigate through your codebase with intelligent search capabilities."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-400" />,
      title: "Security Scanning",
      description: "Identify potential security vulnerabilities and get recommendations for fixes."
    },
    {
      icon: <Code className="h-8 w-8 text-blue-400" />,
      title: "Code Quality Metrics",
      description: "Get detailed insights about code quality, complexity, and maintainability."
    },
    {
      icon: <GitBranch className="h-8 w-8 text-blue-400" />,
      title: "Version Control Integration",
      description: "Seamlessly integrate with popular version control systems."
    },
    {
      icon: <Zap className="h-8 w-8 text-blue-400" />,
      title: "Performance Analysis",
      description: "Identify performance bottlenecks and optimization opportunities."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Powerful Features</h1>
          <p className="text-xl text-gray-400">Discover what makes Code Insight the perfect tool for your development workflow</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors">
              <div className="mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}