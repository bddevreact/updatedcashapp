import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2, 
  Copy, 
  ExternalLink,
  MessageCircle,
  Mail,
  Smartphone,
  Globe,
  CheckCircle
} from 'lucide-react';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
  referralCode?: string;
  title?: string;
  description?: string;
}

interface SocialPlatform {
  name: string;
  icon: string;
  color: string;
  url: string;
  method: 'url' | 'api' | 'native';
}

export default function SocialShareModal({ 
  isOpen, 
  onClose, 
  referralLink, 
  referralCode,
  title = "Join Cash Points and earn real money!",
  description = "Use my referral link to join and start earning rewards instantly. No investment required!"
}: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const shareText = `${title}\n\n${description}\n\n${referralLink}`;
  const shareTextWithCode = referralCode 
    ? `${title}\n\n${description}\n\nReferral Code: ${referralCode}\n\n${referralLink}`
    : shareText;

  const socialPlatforms: SocialPlatform[] = [
    {
      name: 'Telegram',
      icon: '📱',
      color: 'bg-blue-500',
      url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500',
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'Messenger',
      icon: '💙',
      color: 'bg-blue-500',
      url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(referralLink)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.origin)}`,
      method: 'url'
    },
    {
      name: 'Twitter/X',
      icon: '🐦',
      color: 'bg-black',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`,
      method: 'url'
    },
    {
      name: 'Instagram',
      icon: '📷',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      url: `https://www.instagram.com/?url=${encodeURIComponent(referralLink)}`,
      method: 'url'
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
      method: 'url'
    },
    {
      name: 'Reddit',
      icon: '🤖',
      color: 'bg-orange-500',
      url: `https://reddit.com/submit?url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent(title)}`,
      method: 'url'
    },
    {
      name: 'Pinterest',
      icon: '📌',
      color: 'bg-red-500',
      url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(referralLink)}&description=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-gray-500',
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'SMS',
      icon: '📱',
      color: 'bg-green-600',
      url: `sms:?body=${encodeURIComponent(shareText)}`,
      method: 'url'
    },
    {
      name: 'Copy Link',
      icon: '📋',
      color: 'bg-purple-500',
      url: '',
      method: 'api'
    },
    {
      name: 'Copy Text',
      icon: '📝',
      color: 'bg-indigo-500',
      url: '',
      method: 'api'
    },
    {
      name: 'Native Share',
      icon: '🌐',
      color: 'bg-teal-500',
      url: '',
      method: 'native'
    }
  ];

  const handleShare = async (platform: SocialPlatform) => {
    setSelectedPlatform(platform.name);

    try {
      switch (platform.method) {
        case 'url':
          window.open(platform.url, '_blank', 'width=600,height=400');
          break;
        
        case 'api':
          if (platform.name === 'Copy Link') {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else if (platform.name === 'Copy Text') {
            await navigator.clipboard.writeText(shareTextWithCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
          break;
        
        case 'native':
          if (navigator.share) {
            await navigator.share({
              title: title,
              text: description,
              url: referralLink
            });
          } else {
            // Fallback to copy link
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
          break;
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fallback to copy link
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    setTimeout(() => setSelectedPlatform(null), 1000);
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const copyReferralText = async () => {
    try {
      await navigator.clipboard.writeText(shareTextWithCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-navy border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-gold" />
                  Share Referral Link
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Share across social media platforms
              </p>
            </div>

            {/* Referral Link Display */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-xs border border-gray-600 focus:border-gold focus:outline-none"
                />
                <button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-gold to-yellow-500 text-navy px-2 py-1 rounded hover:from-yellow-400 hover:to-gold transition-all duration-300"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              
              {referralCode && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Code:</span>
                  <span className="bg-gold/20 text-gold px-2 py-0.5 rounded text-xs font-mono">
                    {referralCode}
                  </span>
                </div>
              )}
            </div>

            {/* Social Platforms Grid */}
            <div className="p-3">
              <div className="grid grid-cols-4 gap-2">
                {socialPlatforms.slice(0, 8).map((platform) => (
                  <motion.button
                    key={platform.name}
                    onClick={() => handleShare(platform)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-2 rounded-lg border border-white/10 hover:border-white/30 transition-all duration-300 ${
                      selectedPlatform === platform.name ? 'ring-1 ring-gold' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center text-lg mb-1 mx-auto`}>
                      {platform.icon}
                    </div>
                    <div className="text-center">
                      <div className="text-white text-xs font-medium truncate">
                        {platform.name}
                      </div>
                      {selectedPlatform === platform.name && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={copyReferralText}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-1 text-xs font-semibold"
                >
                  <Copy className="w-3 h-3" />
                  Copy Text
                </button>
                <button
                  onClick={() => window.open(referralLink, '_blank')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-1 text-xs font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Link
                </button>
              </div>
            </div>

            {/* Success Message */}
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-2 left-2 right-2 bg-green-500 text-white p-2 rounded-lg flex items-center gap-2"
              >
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Copied to clipboard!</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
