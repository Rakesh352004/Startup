type InsightCardProps = {
  title: string;
  desc: string;
  color: string;
};

export default function InsightCard({ title, desc, color }: InsightCardProps) {
  return (
    <div>
      <h5 className={`font-semibold text-lg mb-1 ${color}`}>{title}</h5>
      <p className="text-gray-400 text-sm mb-4">{desc}</p>
    </div>
  );
}
