import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, Eye } from 'lucide-react';
import cryptogrowth from '../../../assets/img/crypto-growth.jpg';
import cryptosetup from '../../../assets/img/crypto-setup.jpg';
import lock from '../../../assets/img/lock.jpg';

const features = [
  {
    id: '01',
    label: 'Insights',
    title: 'See exactly where your money goes',
    description:
      'Break down your holding by asset, exchange, and strategy. Watch patterns emerge that guide better decisions about when to hold and when to move.',
    image: cryptogrowth,
    icon: Eye,
    ctaPrimary: 'Explore',
    ctaSecondary: 'Analyze',
  },
  {
    id: '02',
    label: 'Ease',
    title: 'Start tracking in minutes, not hours',
    description:
      'Connect your exchanges and wallets without complexity. The dashboard organizes itself around what matters to you, no configuration required.',
    image: cryptosetup,
    icon: Zap,
    ctaPrimary: 'Explore',
    ctaSecondary: 'Start',
  },
  {
    id: '03',
    label: 'Security',
    title: 'Keep complete control of your assets',
    description:
      'We never touch your coins or see your keys. Your wallet stays yours alone, encrypted and protected by your own security measures.',
    image: lock,
    icon: Shield,
    ctaPrimary: 'Explore',
    ctaSecondary: 'Learn more',
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-3xl bg-card shadow-xl shadow-black/5 transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 dark:bg-slate-900 dark:shadow-slate-900/20 dark:hover:shadow-slate-900/30">
        {/* Background linear accent */}
        <div className="absolute inset-0 bg-linear-to-br from-muted/50 via-card to-muted/30 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/30" />

        <div className="relative flex flex-col gap-8 p-6 md:p-10 lg:flex-row lg:items-center lg:gap-12">
          {/* Content */}
          <div className="flex-1 space-y-5">
            {/* Numbered badge with icon */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground dark:group-hover:bg-slate-700 dark:group-hover:text-slate-100">
                <span className="text-[10px] opacity-60">{feature.id}</span>
                <div className="h-px w-3 bg-border" />
                <Icon className="size-3" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {feature.label}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold leading-tight text-foreground md:text-3xl lg:text-4xl dark:text-slate-100">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {feature.description}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                className="group/btn bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {feature.ctaPrimary}
                <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {feature.ctaSecondary}
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full overflow-hidden rounded-2xl lg:w-1/2">
            <div className="absolute inset-0 z-10 bg-linear-to-t from-background/60 via-background/10 to-transparent dark:from-slate-950/60 dark:via-slate-950/10" />
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              src={feature.image}
              alt={feature.title}
              className="aspect-4/3 w-full object-cover"
            />
            {/* Overlay pattern */}
            <div className="absolute inset-0 z-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SectionThree = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <div className="relative overflow-hidden bg-linear-to-b from-muted/30 via-background to-muted/50 py-20 md:py-28 transition-colors duration-300 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-slate-800/30 blur-3xl dark:bg-slate-700/20" />
        <div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-slate-800/30 blur-3xl dark:bg-slate-700/20" />
      </div>

      <div ref={containerRef} className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-16 text-center md:mb-20"
        >
          <span className="mb-4 inline-block rounded-full bg-muted px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Features
          </span>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl dark:text-slate-100">
            Everything you need to track your{' '}
            <span className="bg-linear-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-100">
              crypto portfolio
            </span>
          </h2>
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionThree;
