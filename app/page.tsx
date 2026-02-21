'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  SquareArrowRight, 
  Briefcase, 
  TrendingUp, 
  CheckCircle2,
} from 'lucide-react';
import ImageTabs from '@/components/image-tabs';
import { Footer } from '@/components/footer'; // Import the new Footer

/* -----------------------------
   Animation Variants
-------------------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.12
    }
  }
};

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col bg-white text-zinc-950 font-sans selection:bg-black selection:text-white'>
      
      <main className='flex-1'>
        
        {/* HERO SECTION */}
        <section className='relative overflow-hidden pt-24 pb-32'>
          <div className='absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]' />

          <div className='container mx-auto px-4'>
            <motion.div 
              variants={stagger}
              initial="hidden"
              animate="visible"
              className='mx-auto max-w-4xl text-center'
            >
              <motion.div variants={fadeUp} className='mb-6 flex justify-center'>
                 <span className='inline-flex items-center rounded-full border bg-white px-3 py-1 text-sm font-medium text-zinc-600 shadow-sm'>
                   <span className='mr-2 h-2 w-2 rounded-full bg-green-500' />
                   Now available for free
                 </span>
              </motion.div>

              <motion.h1 
                variants={fadeUp}
                className='mb-6 text-5xl font-bold tracking-tight text-black md:text-7xl'
              >
                Precision tracking for the <br />
                <span className='bg-gradient-to-r from-zinc-500 to-black bg-clip-text text-transparent'>
                  modern professional.
                </span>
              </motion.h1>

              <motion.p 
                variants={fadeUp}
                className='mx-auto mb-10 max-w-2xl text-xl text-zinc-500 leading-relaxed'
              >
                Capture, organize and manage your job search in one place.
                Stop using spreadsheets; start building a pipeline.
              </motion.p>
              
              <motion.div 
                variants={fadeUp}
                className='flex flex-col items-center gap-6'
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    href='/sign-up' 
                    className='inline-flex h-14 items-center justify-center rounded-full bg-black px-10 text-lg font-medium text-white shadow-xl shadow-black/10 transition-colors hover:bg-zinc-800'
                  >
                    Get Started
                    <SquareArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </motion.div>

                <p className='text-sm font-medium text-zinc-400'>
                  Free forever • No credit card required
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* VISUAL CONTEXT & TABS */}
        <section className='bg-zinc-50/50 pb-24 pt-12 border-t border-zinc-100'>
           <div className="container mx-auto px-4 mb-12 text-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                The Workspace
              </h2>
           </div>
           <ImageTabs />
        </section>

        {/* FEATURES SECTION */}
        <section className="border-t bg-white py-32">
          <div className="container mx-auto px-4">
            <motion.div 
               initial="hidden"
               whileInView="visible"
               viewport={{ once: true }}
               variants={stagger}
               className="grid gap-8 md:grid-cols-3"
            >
              {[
                { icon: Briefcase, title: "Organize Applications", text: "Create custom boards and columns to track your job applications at every stage of the process." },
                { icon: TrendingUp, title: "Track Progress", text: "Monitor your application status from applied to interview to offer with visual Kanban boards." },
                { icon: CheckCircle2, title: "Stay Organized", text: "Never lose track of an application. Keep all your job search information in one centralized place." }
              ].map((feature, i) => (
                <motion.div key={i} variants={fadeUp} className="group rounded-2xl border border-zinc-100 bg-white p-8 transition-shadow hover:shadow-xl hover:shadow-zinc-200/50">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-black">{feature.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{feature.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION (New Addition) */}
        <section className="bg-black py-24 text-center text-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to stop guessing?
              </h2>
              <p className="mb-10 text-lg text-zinc-400">
                Join thousands of candidates who organize their search with us. 
                It&apos;s free to start, and takes less than a minute to set up.
              </p>
              <Link 
                href='/sign-up' 
                className='inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-black transition-transform hover:scale-105 active:scale-95'
              >
                Start Tracking Now
                <SquareArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
