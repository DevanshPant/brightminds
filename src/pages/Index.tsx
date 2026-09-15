import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import CoursesSection from '@/components/CoursesSection';
import ProgramsSection from '@/components/ProgramsSection';
import WhyUsSection from '@/components/WhyUsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <CoursesSection />
      <ProgramsSection />
      <WhyUsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
