import { Github, Mail, Twitter } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">About Code Insight</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We're passionate about making code analysis and understanding easier for developers worldwide.
            Our AI-powered platform helps teams write better code and maintain cleaner codebases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
            <p className="text-gray-400 mb-6">
              Code Insight was born from the belief that understanding code shouldn't be a barrier to great software development.
              We're here to make code analysis accessible, intuitive, and powerful for developers of all skill levels.
            </p>
            <p className="text-gray-400">
              By combining cutting-edge AI technology with developer-friendly tools, we're building the future of code comprehension
              and analysis.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Connect With Us</h2>
            <div className="space-y-4">
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-6 w-6" />
                <span>Follow us on Twitter</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <Github className="h-6 w-6" />
                <span>Check our GitHub</span>
              </a>
              <a href="#" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <Mail className="h-6 w-6" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800">
          <p className="text-center text-gray-400">
            © {new Date().getFullYear()} Code Insight. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}