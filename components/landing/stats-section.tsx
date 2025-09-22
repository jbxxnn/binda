export default function StatsSection() {
  const stats = [
    { label: "Active Users", value: "50+" },
    { label: "Businesses Served", value: "80+" },
    { label: "Invoices Processed", value: "500+" },
    { label: "Countries", value: "5+" }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-3xl md:text-4xl font-bold text-brand-hunter mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
