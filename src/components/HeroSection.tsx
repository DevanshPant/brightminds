import { Button } from '@/components/ui/button';
import { useTypingEffect } from '@/hooks/useScrollAnimation';
import { ArrowRight, GraduationCap, Target, Users } from 'lucide-react';

const HeroSection = () => {
  const { displayText, isComplete } = useTypingEffect('SHAPE YOUR FUTURE EARLY', 50, 500);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Decorative Elements */}
      <div className="absolute top-40 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-primary/30 rounded-2xl rotate-45 blur-xl" />
      <div className="absolute bottom-1/3 left-1/4 w-16 h-16 bg-accent/25 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">Classes 7-10 Foundation</span>
        </div>

        {/* Main Heading with Typing Effect */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight">
          <span className="inline-block min-h-[1.2em]">
            {displayText}
            <span className={`inline-block w-1 h-[0.9em] bg-primary ml-1 ${isComplete ? 'animate-pulse' : ''}`} />
          </span>
        </h1>

        {/* Subtitle */}
        <div 
          className="max-w-2xl mx-auto mb-10 opacity-0 animate-fade-up"
          style={{ animationDelay: '2s', animationFillMode: 'forwards' }}
        >
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-3">
            At BrightMinds, we believe the foundation for a successful career starts in middle school.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground/80 leading-relaxed">
            Comprehensive Coaching, Career Guidance, and Mentorship, all under one roof.
          </p>
        </div>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 opacity-0 animate-fade-up"
          style={{ animationDelay: '2.5s', animationFillMode: 'forwards' }}
        >
          <Button
            variant="hero"
            size="xl"
            onClick={() => scrollToSection('#contact')}
            className="group"
          >
            Start Your Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
          <Button
            variant="heroOutline"
            size="xl"
            onClick={() => scrollToSection('#programs')}
          >
            Explore Programs
          </Button>
        </div>

        {/* Feature Cards */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto opacity-0 animate-fade-up"
          style={{ animationDelay: '3s', animationFillMode: 'forwards' }}
        >
          <div className="group bg-background/60 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 hover:bg-background hover:shadow-golden hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors duration-300">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Expert Mentors</h3>
            <p className="text-sm text-muted-foreground">Guidance from experienced educators</p>
          </div>

          <div className="group bg-background/60 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 hover:bg-background hover:shadow-golden hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-accent/20 transition-colors duration-300">
              <Target className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Career Clarity</h3>
            <p className="text-sm text-muted-foreground">Early exposure to future pathways</p>
          </div>

          <div className="group bg-background/60 backdrop-blur-sm border border-primary/10 rounded-2xl p-6 hover:bg-background hover:shadow-golden hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors duration-300">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Small Batches</h3>
            <p className="text-sm text-muted-foreground">Personalized attention for each student</p>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
