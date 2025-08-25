import React from 'react';
import { motion } from 'framer-motion';

export default function TokenStats() {
  return (
    <div className="glass p-6 border border-white/10">
      <motion.h2 
        className="text-lg font-semibold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Cash Points
      </motion.h2>
      <div className="mt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Supply</span>
          <span className="font-semibold">৳1,000,000</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Circulating</span>
          <span className="font-semibold">৳750,000</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Market Cap</span>
          <span className="font-semibold">৳750,000</span>
        </div>
      </div>
    </div>
  );
}