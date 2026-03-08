const Hero = () => {
  return (
    <section role="banner" className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-20">
      <img
        alt="Minibus driving through the Yorkshire countryside"
        className="absolute inset-0 w-full h-full object-cover"
        src="/images/hero-minibus.jpg"
        fetchPriority="high"
        decoding="async"
        width={1920}
        height={1080} />
      
      <div className="absolute inset-0 bg-navy/70" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 uppercase tracking-widest text-gold-light text-lg font-bold">
          Your Trusted Minibus Service
        </p>
        <h1 className="font-serif text-4xl leading-tight text-primary-foreground sm:text-5xl text-balance lg:text-4xl font-light">Comfortable, Reliable Minibus Hire
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
          From weddings and airport transfers to school trips and nights out — we make group travel easy, safe and affordable.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#enquiry"
            className="bg-gold px-8 py-4 text-base font-semibold text-navy transition-colors hover:bg-gold-light rounded-xl">
            
            Book with us!  
          </a>
          <a
            href="#services"
            className="border-2 border-primary-foreground/30 px-8 py-4 text-base font-semibold text-primary-foreground transition-colors hover:border-gold hover:text-gold rounded-xl">
            
            Our Services
          </a>
        </div>
      </div>
    </section>);

};

export default Hero;