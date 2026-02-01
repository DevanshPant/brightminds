import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { CheckCircle2, Star } from 'lucide-react';

const WhyUsSection = () => {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>();

  const reasons = [
    'Personalized attention with small batch sizes',
    'Experienced and passionate educators',
    'Focus on conceptual understanding, not rote learning',
    'Regular parent-teacher interactions',
    'Career counseling integrated into curriculum',
    'Safe and positive learning environment',
    'Modern Classrooms for Modern Learning',
  ];

  return (
    <section
      id="why-us"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-foreground relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-60 h-60 bg-accent/15 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-sm font-medium text-primary mb-4">
              Why Choose Us
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-background mb-6 uppercase">
              WHAT MAKES US DIFFERENT
            </h2>
            <p className="text-lg text-background/70 mb-10 leading-relaxed">
              BrightMinds classrooms combine advanced educational technology with comfortable infrastructure, creating a learning space that keeps students attentive, motivated, and confident.
            </p>

            {/* Star Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
                <span className="text-background/70 text-sm ml-2">
                Trusted by parents across Ahilyanagar
              </span>
            </div>
          </div>

          {/* Right Content - Reasons List */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <div className="bg-background/10 backdrop-blur-sm border border-background/10 rounded-3xl p-8">
              <div className="space-y-4">
                {reasons.map((reason, index) => (
                  <div
                    key={reason}
                    className={`flex items-center gap-4 p-4 rounded-xl bg-background/5 hover:bg-background/10 transition-all duration-300 ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-5'
                    }`}
                    style={{ transitionDelay: `${300 + index * 50}ms` }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-background/90 font-medium">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
