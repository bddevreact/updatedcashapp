import React from 'react';
import { X, Zap } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (level: number) => void;
  selectedPowerLevel: number | null;
  setSelectedPowerLevel: (level: number | null) => void;
  paymentMethod: 'BDT' | 'CRYPTO';
  setPaymentMethod: (method: 'BDT' | 'CRYPTO') => void;
  balance: number;
  miningPowerLevels: Array<{
    level: number;
    cost: number;
    rate: number;
    usdPrice: number;
  }>;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  onPurchase,
  selectedPowerLevel,
  setSelectedPowerLevel,
  paymentMethod,
  setPaymentMethod,
  balance,
  miningPowerLevels
}: Props) {
  const { address, isConnected } = useAccount();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-6 modal-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Purchase Mining Power</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Payment Method Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setPaymentMethod('BDT')}
            className={`flex-1 py-2 rounded-lg font-medium ${
              paymentMethod === 'BDT'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            Pay with BDT
          </button>
          <button
            onClick={() => setPaymentMethod('CRYPTO')}
            className={`flex-1 py-2 rounded-lg font-medium ${
              paymentMethod === 'CRYPTO'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            Pay with Crypto
          </button>
        </div>

        {paymentMethod === 'CRYPTO' && !isConnected && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center text-blue-500 mb-2">
              <span className="font-medium">Connect Wallet</span>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Connect your wallet to make payments with crypto
            </p>
            <w3m-button />
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {miningPowerLevels.map((power, index) => (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg p-4 ${
                selectedPowerLevel === power.level ? 'border-2 border-purple-500' : ''
              }`}
              onClick={() => setSelectedPowerLevel(power.level)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                    <Zap className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Level {power.level}</div>
                    <div className="text-gray-400 text-sm">
                      {formatNumber(power.rate * 3600)}/hour
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {paymentMethod === 'BDT' ? (
                    <div className="text-purple-500 font-medium">
                      ৳{formatNumber(power.cost)}
                    </div>
                  ) : (
                    <div className="text-green-500 font-medium">
                      ৳{power.usdPrice} (Crypto)
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onPurchase(power.level)}
                disabled={paymentMethod === 'BDT' ? balance < power.cost : !isConnected}
                className={`w-full py-2 rounded-lg font-medium ${
                  paymentMethod === 'BDT'
                    ? balance >= power.cost
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-600 text-gray-400'
                    : isConnected
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400'
                }`}
              >
                {paymentMethod === 'BDT'
                  ? balance >= power.cost ? 'Purchase with BDT' : 'Insufficient Balance'
                  : isConnected ? 'Purchase with Crypto' : 'Connect Wallet'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}