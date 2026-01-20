import Sidebar from '@/components/Sidebar'
import { UserAccountButton } from '@/components/UserAccountButton'
import { useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'

interface PageWrapperProps {
  children: React.ReactNode
}

const contentVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export function PageWrapper({ children }: PageWrapperProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10">
        {/* Sidebar - animated menu */}
        <Sidebar />

        {/* User Account Button - fixed top right */}
        <UserAccountButton />

        {/* Main Content - animated */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
            className="p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

