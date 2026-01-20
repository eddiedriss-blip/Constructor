import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function UserAccountButton() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLocation('/auth');
  };

  const userEmail = user?.email || 'Utilisateur';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <div className="fixed top-6 right-6 z-50 pointer-events-none">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:bg-black/30 transition-colors shadow-lg pointer-events-auto"
      >
        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center">
          <User size={16} />
        </div>
        <span className="text-sm font-medium hidden md:block">{userName}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                    <p className="text-xs text-white/70 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <Button
                  onClick={handleSignOut}
                  className="w-full justify-start bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg"
                >
                  <LogOut size={16} className="mr-2" />
                  Se déconnecter
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

