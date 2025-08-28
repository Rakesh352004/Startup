// components/ContactSection.tsx
import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

export default function ContactSection() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Error connecting to server." },
      ]);
    }

    setInput("");
  };

  return (
    <section
      className="
        absolute top-16 left-16    /* push below navbar (64px) and beside sidebar (256px) */
        w-[calc(100vw-256px)]      /* take full width minus sidebar */
        h-[calc(100vh-64px)]       /* take full height minus navbar */
        bg-gray-900/90
        flex flex-col
        pl-10 
      "
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700 bg-gray-800/80">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Startup GPS Assistant</h3>
          <p className="text-sm text-gray-400">Always here to help</p>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto space-y-3 bg-gray-900/60 p-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                m.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-700 text-gray-200 rounded-bl-none"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/80 flex space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 px-4 py-2 rounded-lg text-white hover:bg-blue-700 flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
