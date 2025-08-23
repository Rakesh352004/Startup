// components/ContactSection.tsx
import { Phone, Check, Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  category: string;
  message: string;
}

export default function ContactSection() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    category: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
    alert('Message sent successfully!');
    setFormData({ name: '', email: '', category: '', message: '' });
  };

  return (
    <section className="px-4 max-w-6xl mx-auto py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Contact Options
        </h2>
        <p className="text-xl text-gray-400 leading-relaxed">
          Choose the best way to get in touch with our support team
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Contact Methods */}
        <div className="space-y-6">
          {/* Live Chat Support */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Live Chat Support</h3>
                <p className="text-sm text-gray-400">Get instant help from our support team</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-400 text-sm">Available 24/7</span>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300">
              Start Live Chat
            </button>
          </div>

          {/* Call Request */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Request a Call</h3>
                <p className="text-sm text-gray-400">Schedule a phone call with our experts</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <Check className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-400 text-sm">Available Monday-Friday, 9AM-5PM</span>
            </div>
            <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300">
              Request Call
            </button>
          </div>

          {/* Email Support */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Email Support</h3>
                <p className="text-sm text-gray-400">Send us detailed questions or feedback</p>
              </div>
            </div>
            <div className="flex items-center mb-4">
              <Check className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-400 text-sm">Response within 4 hours</span>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300">
              Send Email
            </button>
          </div>
        </div>

        {/* Right Column - Contact Form */}
        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">Send us a Message</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select a category</option>
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="billing">Billing Question</option>
                <option value="feature">Feature Request</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tell us how we can help you..."
                rows={4}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-vertical"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span>Send Message</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}