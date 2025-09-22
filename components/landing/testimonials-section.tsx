import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Emmanuel Wachira",
      role: "CEO, Wachira Group",
      content: "Binda transformed our business operations. The financial clarity and customer management features are game-changers.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Omotola Steven",
      role: "Founder, Stella Stores",
      content: "Finally, a business management platform that actually understands small business needs. Highly recommended!",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Elizabeth John",
      role: "Operations Manager, John's Pharmacy",
      content: "The reporting features and user interface are exceptional. Our team productivity increased by 40%.",
      rating: 5,
      avatar: "ER"
    }
  ];

  return (
    <section id="testimonials" className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What our customers say about <span className="text-brand-tropical">Binda</span>
          </h2>
          <p className="text-xl text-gray-600">
            Join thousands of satisfied businesses using Binda to grow their operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">&quot;{testimonial.content}&quot;</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-tropical rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
