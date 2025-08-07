interface SimpleCardProps {
  title: string;
  desc: string;
  color: string;
  icon?: string;
}

export default function SimpleCard({ title, desc, color, icon }: SimpleCardProps) {
  return (
    <div className="bg-[#1c0f4c] p-6 rounded-xl shadow-lg border border-purple-700 max-w-xs">
      {icon && <div className="text-2xl mb-3">{icon}</div>}
      <h3 className={`text-lg font-bold mb-2 ${color}`}>{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}