type FeatureCardProps = {
  icon: string;
  title: string;
  desc: string;
  bg: string;
};

export default function FeatureCard({ icon, title, desc, bg }: FeatureCardProps) {
  return (
    <div className="bg-[#120b3a] p-6 rounded-xl shadow-md border border-gray-700 text-left hover:ring-2 hover:ring-purple-500 transition-all">
      <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white mb-3 ${bg}`}>{icon}</div>
      <h4 className="text-lg font-semibold mb-1">{title}</h4>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
