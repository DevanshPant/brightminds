import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MapPin, Send, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ContactSection = () => {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentClass: '',
    parentContact: '',
    email: '',
    message: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Prefer an Apps Script endpoint if provided via Vite env: VITE_APPS_SCRIPT_URL
    const appsScriptUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';
    const useAppsScript = appsScriptUrl && !appsScriptUrl.includes('DEPLOY_ID');

    // Fallback to Google Forms formResponse if Apps Script is not configured
    const googleFormBaseUrl = useAppsScript
      ? appsScriptUrl
      : 'https://docs.google.com/forms/d/e/1FAIpQLSeC-iaeX4k9Jzus0rseHbFsD8TsTuIL1tb2V_FE-bfyjwLHvA/formResponse';

    // Create hidden iframe for form submission (avoids CORS preflight)
    const iframe = document.createElement('iframe');
    iframe.name = 'hidden_iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Create a form element to submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = googleFormBaseUrl;
    form.target = 'hidden_iframe';

    // Add form fields (send both entry.* fields and readable keys for Apps Script)
    const fields = [
      { name: 'entry.330719284', value: formData.studentName },
      { name: 'entry.313112089', value: formData.studentClass ? `Class ${formData.studentClass}` : '' },
      { name: 'entry.1750223016', value: formData.parentContact },
      { name: 'entry.743997789', value: formData.email },
      { name: 'entry.266804100', value: formData.message },
      // Duplicate with readable keys for Apps Script JSON parsing (Apps Script will accept either)
      { name: 'studentName', value: formData.studentName },
      { name: 'studentClass', value: formData.studentClass },
      { name: 'parentContact', value: formData.parentContact },
      { name: 'email', value: formData.email },
      { name: 'message', value: formData.message },
    ];

    fields.forEach(field => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = field.name;
      input.value = field.value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    // If we posted directly to Google Forms (no Apps Script), open a prefill view as a fallback
    // This ensures the user can still submit if the automated POST was rejected.
    if (!useAppsScript) {
      const formId = '1FAIpQLSeC-iaeX4k9Jzus0rseHbFsD8TsTuIL1tb2V_FE-bfyjwLHvA';
      const prefillUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url` +
        `&entry.330719284=${encodeURIComponent(formData.studentName)}` +
        `&entry.313112089=${encodeURIComponent(formData.studentClass ? `Class ${formData.studentClass}` : '')}` +
        `&entry.1750223016=${encodeURIComponent(formData.parentContact)}` +
        `&entry.743997789=${encodeURIComponent(formData.email)}` +
        `&entry.266804100=${encodeURIComponent(formData.message)}`;

      // Open fallback in a new tab after a short delay so the hidden form has a chance to submit
      setTimeout(() => {
        try { window.open(prefillUrl, '_blank'); } catch (e) { /* ignore */ }
      }, 1400);
    }

    // Cleanup after submission
    setTimeout(() => {
      try {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
      } catch (e) { /* ignore */ }

      toast({
        title: "Enquiry Submitted Successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({
        studentName: '',
        studentClass: '',
        parentContact: '',
        email: '',
        message: '',
      });

      setIsSubmitting(false);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email Us',
      value: 'hello@brightminds.in',
      subtext: 'Quick response guaranteed',
    },
    {
      icon: MapPin,
      label: 'Visit Us',
      value: 'Ahilyanagar',
      subtext: 'Maharashtra, India',
    },
    {
      icon: Clock,
      label: 'Office Hours',
      value: '9:00 AM - 7:00 PM',
      subtext: 'Monday to Saturday',
    },
  ];

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-gradient-golden relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-foreground mb-4">
            Get in Touch
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-6 uppercase">
            READY TO START YOUR JOURNEY?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Have questions? Fill out the form below and our team will reach out 
            to discuss how we can help your child excel.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Contact Info */}
          <div
            className={`lg:col-span-2 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <div className="space-y-6">
              {contactInfo.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-start gap-4 p-5 rounded-2xl bg-background/80 border border-primary/10 hover:shadow-golden hover:border-primary/30 transition-all duration-300 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-golden flex-shrink-0">
                    <item.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">{item.label}</p>
                    <p className="font-display font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div
            className={`lg:col-span-3 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <form onSubmit={handleSubmit} className="bg-background rounded-3xl shadow-golden-lg p-8 lg:p-10 border border-primary/10">
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="studentName" className="block text-sm font-medium text-foreground mb-2">
                    Student Name *
                  </label>
                  <Input
                    id="studentName"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleInputChange}
                    placeholder="Enter student's name"
                    required
                    className="h-12 rounded-xl border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="studentClass" className="block text-sm font-medium text-foreground mb-2">
                    Current Class *
                  </label>
                  <select
                    id="studentClass"
                    name="studentClass"
                    value={formData.studentClass}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 rounded-xl border border-primary/20 bg-background px-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select class</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="parentContact" className="block text-sm font-medium text-foreground mb-2">
                    Parent Contact *
                  </label>
                  <Input
                    id="parentContact"
                    name="parentContact"
                    type="tel"
                    value={formData.parentContact}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                    required
                    className="h-12 rounded-xl border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="parent@email.com"
                    className="h-12 rounded-xl border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="mb-8">
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message (Optional)
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us about your child's interests or any specific requirements..."
                  rows={4}
                  className="rounded-xl border-primary/20 focus:border-primary focus:ring-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Enquiry
                    <Send className="w-5 h-5" />
                  </>
                )}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                We'll respond within 24 hours
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
