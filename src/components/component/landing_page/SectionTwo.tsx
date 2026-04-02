import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Lock, TrendingUp } from 'lucide-react';
import charts from '../../../assets/img/charts.jpg';
import data from '../../../assets/img/data.jpg';
import lock from '../../../assets/img/lock.jpg';

const cards = [
  {
    id: 1,
    label: 'Markets',
    title: 'Live data from every exchange',
    description: 'Prices, volumes, and trends arrive instantly without delay',
    image: data,
    icon: TrendingUp,
    link: 'Explore',
  },
  {
    id: 2,
    label: 'Analytics',
    title: 'Charts that show what matters most',
    description: 'Visualize gains, losses, and allocation across your entire portfolio',
    image: charts,
    icon: BarChart3,
    link: 'Analyze',
  },
  {
    id: 3,
    label: 'Security',
    title: 'Your keys, your coins, your control',
    description: 'We never hold your assets or access your private keys',
    image: lock,
    icon: Lock,
    link: 'Learn',
  },
];

const FeatureCard = ({
  card,
  index,
}: {
  card: (typeof cards)[0];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = card.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl bg-card shadow-lg shadow-black/5 transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 dark:bg-slate-900 dark:shadow-slate-900/20 dark:hover:shadow-slate-900/30"
    >
      {/* Image */}
      <div className="relative h-80 overflow-hidden">
        <motion.img
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          src={card.image}
          alt={card.title}
          className="h-full w-full object-cover"
        />
        {/* linear overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
        
        {/* Icon badge */}
        <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
          <Icon className="size-5 text-white" />
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            {card.label}
          </span>
          <h3 className="text-xl font-bold text-white">{card.title}</h3>
        </div>
      </div>

      {/* Description section */}
      <div className="bg-card p-6 transition-colors duration-300 group-hover:bg-muted dark:bg-slate-900 dark:group-hover:bg-slate-800">
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {card.description}
        </p>
        <Link
          to=""
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary dark:group-hover:text-slate-200"
        >
          {card.link}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

const SectionTwo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });

  return (
    <div className="relative overflow-hidden bg-background py-20 md:py-28 transition-colors duration-300 dark:bg-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 top-20 h-64 w-64 rounded-full bg-gray-100 blur-3xl dark:bg-slate-800" />
        <div className="absolute -left-32 bottom-20 h-64 w-64 rounded-full bg-gray-100 blur-3xl dark:bg-slate-800" />
      </div>

      <div ref={containerRef} className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-muted px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tracking
          </span>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl dark:text-slate-100">
            Monitor holdings in{' '}
            <span className="bg-linear-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-100">
              real time
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Watch your positions update as markets move
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <FeatureCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionTwo;
