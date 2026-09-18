"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Coins, Layers, KeyRound, Play, Pause, Check, Terminal, ShieldCheck, Zap, ShieldAlert } from 'lucide-react';
import { DIRECT_SUPPLY } from '../lib/chains';
import { HOOD_MAINNET } from '../lib/launcher-evm';

interface PresetPrompt {
  id: string;
  tag: string;
  prompt: string;
  name: string;
  symbol: string;
  supply: string;
  curve: string;
}

const PROMPT_PRESETS: PresetPrompt[] = [
  {
    id: 'agent',
    tag: 'Autonomous Agent',
    prompt: 'Autonomous liquidity scout with deterministic trading triggers and community revenue split.',
    name: 'Agent Sovereign',
    symbol: '$AGNT',
    supply: '999,000,000',
    curve: 'Linear AMM Pair'
  },
  {
    id: 'meme',
    tag: 'Community Launch',
    prompt: 'Fair launched viral community token with locked LP and zero team allocation.',
    name: 'Artemis Gold',
    symbol: '$ARTEMIS',
    supply: '999,000,000',
    curve: 'Uniswap V2 Pool'
  },
  {
    id: 'desci',
    tag: 'Research DAO',
    prompt: 'Decentralized research collective funding open-source compute models.',
    name: 'OpenCompute',
    symbol: '$COMP',
    supply: '999,000,000',
    curve: 'Dual-Rail Bonding'
  }
];

const STAGES = [
  {
    id: 'synthesis',
    roman: 'STAGE I',
    shortTitle: 'Prompt',
    tabTitle: 'Prompt Spec',
    title: 'Prompt Synthesis',
    badge: 'NATURAL LANGUAGE',
    icon: Cpu,
    desc: 'Copilot decomposes freeform ideas into cryptographically sound ERC20 / SPL launch specifications.'
  },
  {
    id: 'tokenomics',
    roman: 'STAGE II',
    shortTitle: 'Genesis',
    tabTitle: 'Genesis Mint',
    title: 'Genesis Mint',
    badge: 'FIXED CAP',
    icon: Coins,
    desc: 'Supply is struck onchain in a single immutable genesis block without mint functions or admin keys.'
  },
  {
    id: 'liquidity',
    roman: 'STAGE III',
    shortTitle: 'Pool',
    tabTitle: 'Pool Deploy',
    title: 'Pool Settlement',
    badge: 'AUTOMATED AMM',
    icon: Layers,
    desc: 'Smart contracts atomicly pair initial tokens into Uniswap V2 on Robinhood Chain or pump.fun AMMs.'
  },
  {
    id: 'runtime',
    roman: 'STAGE IV',
    shortTitle: 'Signing',
    tabTitle: 'Client Sign',
    title: 'Client Runtime',
    badge: 'ZERO CUSTODY',
    icon: KeyRound,
    desc: 'Transactions are assembled client-side and dispatched directly through your connected browser wallet.'
  }
];

const STAGE_DURATION_MS = 4200; // 4.2s per stage
const TICK_MS = 35; // 28fps smooth tick
const progressStep = (TICK_MS / STAGE_DURATION_MS) * 100;

export const StepsSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  
  // Interactive State for Stage 0 (Prompt Synthesis)
  const [selectedPreset, setSelectedPreset] = useState<PresetPrompt>(PROMPT_PRESETS[0]);
  
  // Interactive State for Stage 1 (Genesis Tokenomics)
  const [auditTest, setAuditTest] = useState<'idle' | 'mint' | 'owner'>('idle');
  
  // Interactive State for Stage 2 (Liquidity Settlement)
  const [activeNetwork, setActiveNetwork] = useState<'robinhood' | 'solana'>('robinhood');
  
  // Interactive State for Stage 3 (Client Runtime)
  const [isDryRunning, setIsDryRunning] = useState<boolean>(false);
  const [dryRunDone, setDryRunDone] = useState<boolean>(false);

  // Strictly sequential auto-advance loop synchronized with progress
  useEffect(() => {
    if (!isPlaying || isHovered) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + progressStep >= 100) {
          setActiveStage((current) => (current + 1) % STAGES.length);
          return 0;
        }
        return prev + progressStep;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered]);

  const handleStageSelect = (index: number) => {
    setActiveStage(index);
    setProgress(0);
  };

  const handleRunDryRun = () => {
    setIsDryRunning(true);
    setDryRunDone(false);
    setTimeout(() => {
      setIsDryRunning(false);
      setDryRunDone(true);
    }, 500);
  };

  return (
    <section
      id="how-it-works"
      data-theme="light"
      className="steps-section py-20 sm:py-24 px-[max(6.25vw,24px)] bg-[#f8f6f0] text-[#18191c] overflow-hidden w-full border-t border-[#18191c]/10"
    >
      <div className="max-w-[1360px] mx-auto w-full">
        
        {/* Section Header */}
        <div className="mb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-[#18191c]/55 mb-3 border-b border-[#18191c]/15 pb-1">
            <span>PROTOCOL LIFECYCLE</span>
            <span className="text-[#18191c]/25">/</span>
            <span>END-TO-END PIPELINE</span>
          </div>
          <h2 className="font-unbounded text-2xl sm:text-4xl lg:text-[2.5rem] font-bold tracking-tight text-[#18191c] leading-[1.15]">
            From Spark to Onchain Liquidity.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#18191c]/70 max-w-xl leading-relaxed font-sans text-center">
            Explore how Artemis automates deterministic token synthesis, contract compilation, liquidity deployment, and local key signing.
          </p>
        </div>

        {/* Interactive Lifecycle Console */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full border border-[#18191c]/15 bg-white/90 backdrop-blur-md rounded-sm shadow-xs overflow-hidden"
        >
          
          {/* Stage Tab Rail (Unified 4-stage sequential progress track) */}
          <div className="grid grid-cols-4 border-b border-[#18191c]/10 bg-[#18191c]/[0.02]">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = activeStage === idx;
              const isPassed = idx < activeStage;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageSelect(idx)}
                  className={`text-left p-3 sm:p-5 relative transition-all duration-200 border-r last:border-r-0 border-[#18191c]/10 flex flex-col justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-white shadow-[inset_0_-2px_0_#18191c]'
                      : 'hover:bg-[#18191c]/[0.03] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
                    <span className={`p-1.5 sm:p-2 rounded-[2px] transition-colors ${
                      isActive
                        ? 'bg-[#fae8a4] text-[#18191c]'
                        : 'bg-[#18191c]/5 text-[#18191c]/60 group-hover:text-[#18191c]'
                    }`}>
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                    <span className="font-mono text-[9px] sm:text-[10px] tracking-wider text-[#18191c]/50 uppercase font-semibold">
                      {stage.roman}
                    </span>
                  </div>

                  <div className="min-h-[1.5rem] flex items-center overflow-hidden">
                    <h3 className={`font-unbounded text-[10px] sm:text-[11px] lg:text-xs font-bold tracking-tight transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                      isActive ? 'text-[#18191c]' : 'text-[#18191c]/70'
                    }`}>
                      <span className="md:hidden">{stage.shortTitle}</span>
                      <span className="hidden md:inline">{stage.tabTitle}</span>
                    </h3>
                  </div>

                  {/* Connected Sequential Progress Bar at bottom of each tab */}
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#18191c]/10 overflow-hidden">
                    {isActive ? (
                      <div
                        className="h-full bg-[#18191c] transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    ) : isPassed ? (
                      <div className="h-full w-full bg-[#18191c]/30" />
                    ) : (
                      <div className="h-full w-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <style>{`
            @keyframes stageProgressFill {
              0% { width: 0%; }
              100% { width: 100%; }
            }
            @keyframes termLineFade {
              0% { opacity: 0; transform: translateY(5px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .term-line-1 { animation: termLineFade 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
            .term-line-2 { animation: termLineFade 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }
            .term-line-3 { animation: termLineFade 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.32s both; }
            .term-line-4 { animation: termLineFade 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.46s both; }
            .term-line-5 { animation: termLineFade 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.60s both; }
          `}</style>

          {/* Active Stage Interactive Sandbox Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            
            {/* Left Control Column (Interactive Playground for selected stage) */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#18191c]/10 bg-white">
              <div>
                <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-[#18191c]/60 uppercase tracking-widest">
                  <span>{STAGES[activeStage].roman} {"//"} Stage Inspector</span>
                </div>
                
                <h3 className="font-unbounded text-xl sm:text-2xl font-bold text-[#18191c] mb-2 leading-tight">
                  {STAGES[activeStage].title}
                </h3>
                
                <p className="text-xs sm:text-sm text-[#18191c]/75 leading-relaxed font-sans mb-6">
                  {STAGES[activeStage].desc}
                </p>

                {/* Stage-Specific Interactive Controls */}
                {activeStage === 0 && (
                  <div className="space-y-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#18191c]/50 font-semibold">
                      Click to Test Prompt Archetype:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedPreset(preset)}
                          className={`text-xs px-3 py-1.5 rounded-[2px] font-mono transition-all border cursor-pointer ${
                            selectedPreset.id === preset.id
                              ? 'bg-[#18191c] text-[#fae8a4] border-[#18191c] shadow-xs'
                              : 'bg-white text-[#18191c]/80 border-[#18191c]/20 hover:border-[#18191c]/50'
                          }`}
                        >
                          {preset.tag}
                        </button>
                      ))}
                    </div>

                    <div className="p-3 bg-[#18191c]/5 rounded-[2px] border border-[#18191c]/10 text-xs font-sans italic text-[#18191c]/80 leading-relaxed">
                      &quot;{selectedPreset.prompt}&quot;
                    </div>
                  </div>
                )}

                {activeStage === 1 && (
                  <div className="space-y-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#18191c]/50 font-semibold">
                      Test Onchain Invariant Reverts:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAuditTest(auditTest === 'mint' ? 'idle' : 'mint')}
                        className={`text-xs px-3 py-1.5 rounded-[2px] font-mono transition-all border cursor-pointer inline-flex items-center gap-1.5 ${
                          auditTest === 'mint'
                            ? 'bg-[#18191c] text-red-300 border-[#18191c]'
                            : 'bg-white text-[#18191c]/80 border-[#18191c]/20 hover:border-[#18191c]/50'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-red-400" />
                        <span>Test Arbitrary Mint()</span>
                      </button>
                      <button
                        onClick={() => setAuditTest(auditTest === 'owner' ? 'idle' : 'owner')}
                        className={`text-xs px-3 py-1.5 rounded-[2px] font-mono transition-all border cursor-pointer inline-flex items-center gap-1.5 ${
                          auditTest === 'owner'
                            ? 'bg-[#18191c] text-amber-200 border-[#18191c]'
                            : 'bg-white text-[#18191c]/80 border-[#18191c]/20 hover:border-[#18191c]/50'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                        <span>Test Owner Backdoor</span>
                      </button>
                    </div>

                    <div className="p-3 bg-[#18191c]/5 rounded-[2px] border border-[#18191c]/10 text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#18191c]/60">Total Fixed Supply:</span>
                        <span className="font-bold text-[#18191c]">{DIRECT_SUPPLY.toLocaleString()} TOKENS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#18191c]/60">Mint Authority:</span>
                        <span className="font-bold text-emerald-700">RENOUNCED AT GENESIS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#18191c]/60">Platform Tax:</span>
                        <span className="font-bold text-emerald-700">0.00% (IMMUTABLE)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeStage === 2 && (
                  <div className="space-y-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#18191c]/50 font-semibold">
                      Select Liquidity Network:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveNetwork('robinhood')}
                        className={`p-3 text-left rounded-[2px] border transition-all cursor-pointer ${
                          activeNetwork === 'robinhood'
                            ? 'bg-[#18191c] text-[#fae8a4] border-[#18191c]'
                            : 'bg-white text-[#18191c]/80 border-[#18191c]/20 hover:border-[#18191c]/50'
                        }`}
                      >
                        <div className="font-bold font-unbounded text-xs">Robinhood Chain</div>
                        <div className="text-[10px] font-mono opacity-70 mt-0.5">Uniswap V2 Router</div>
                      </button>
                      <button
                        onClick={() => setActiveNetwork('solana')}
                        className={`p-3 text-left rounded-[2px] border transition-all cursor-pointer ${
                          activeNetwork === 'solana'
                            ? 'bg-[#18191c] text-[#fae8a4] border-[#18191c]'
                            : 'bg-white text-[#18191c]/80 border-[#18191c]/20 hover:border-[#18191c]/50'
                        }`}
                      >
                        <div className="font-bold font-unbounded text-xs">Solana Mainnet</div>
                        <div className="text-[10px] font-mono opacity-70 mt-0.5">pump.fun AMM</div>
                      </button>
                    </div>

                    <div className="p-3 bg-[#18191c]/5 rounded-[2px] border border-[#18191c]/10 text-xs font-mono">
                      <span className="text-[#18191c]/60 block mb-1">Target Router Contract:</span>
                      <span className="font-mono text-[#18191c] font-semibold select-all break-all text-[11px]">
                        {activeNetwork === 'robinhood' ? (HOOD_MAINNET.router ?? '0x89e5db8b5aa49aa85ac63f691524311aeb649eba') : '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'}
                      </span>
                    </div>
                  </div>
                )}

                {activeStage === 3 && (
                  <div className="space-y-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#18191c]/50 font-semibold">
                      Client-Side Cryptographic Execution:
                    </span>
                    <div>
                      <button
                        onClick={handleRunDryRun}
                        disabled={isDryRunning}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18191c] text-[#fae8a4] font-mono text-xs font-semibold rounded-[2px] hover:bg-[#18191c]/90 transition-colors cursor-pointer"
                      >
                        {isDryRunning ? (
                          <>
                            <div className="w-3 h-3 border-2 border-[#fae8a4] border-t-transparent rounded-full animate-spin" />
                            Simulating RPC Broadcast...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-[#fae8a4]" />
                            Simulate Client-Side Dry Run
                          </>
                        )}
                      </button>
                    </div>

                    {dryRunDone && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300/60 rounded-[2px] text-xs font-mono text-emerald-900 flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold">Signature Verified Locally (0 Server Exposure)</div>
                          <div className="text-[11px] opacity-80 mt-0.5">Hash: 0x7f83b2...a891 · Nonce: 0 · Gas: ~0.00084 ETH</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Console Footer Play/Pause Controller */}
              <div className="mt-8 pt-4 border-t border-[#18191c]/10 flex items-center justify-between text-xs font-mono text-[#18191c]/60">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="inline-flex items-center gap-2 hover:text-[#18191c] transition-colors cursor-pointer"
                >
                  {isPlaying && !isHovered ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Auto-Tour</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Auto-Tour</span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#18191c]/50 tracking-wider">
                  <span className="hidden sm:inline">(Hover to pause)</span>
                  <span>{"//"}</span>
                  <span>{(!isPlaying || isHovered) ? 'STATUS: PAUSED' : 'STATUS: STREAMING'}</span>
                </div>
              </div>
            </div>

            {/* Right Output Column (Live Reactive Terminal & Receipt Monitor) */}
            <div className="lg:col-span-6 bg-[#131416] text-[#f8f6f0] p-6 sm:p-8 font-mono flex flex-col justify-between">
              <div>
                {/* Terminal Header with Unix Window Chrome (Zero emoji, zero green dot) */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-[11px] text-white/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/25 bg-white/5 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full border border-white/25 bg-white/5 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full border border-white/25 bg-white/5 inline-block" />
                    </div>
                    <span className="tracking-wider uppercase font-semibold text-white/75 text-[10px] sm:text-[11px]">
                      artemis@hood-node: ~/pipeline/{STAGES[activeStage].id}.sh
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className={(!isPlaying || isHovered) ? 'text-amber-300 font-semibold' : 'text-[#fae8a4]'}>
                      {(!isPlaying || isHovered) ? '[PAUSED]' : '[STREAMING]'}
                    </span>
                    <span className="text-white/25">|</span>
                    <span className="text-white/40">{Math.round(progress)}%</span>
                  </div>
                </div>

                {/* Live Paced Terminal Logs (Synchronized directly with stage progress) */}
                <div className="space-y-2.5 text-xs text-white/85 min-h-[220px]">
                  {activeStage === 0 && (
                    <>
                      <div className="text-white/40">{"//"} [00:00.08] NLP Extraction Vector:</div>
                      <div className="text-[#fae8a4] flex items-center">
                        <span>&gt; copilot.parseNaturalPrompt(input)</span>
                        {progress < 25 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                      </div>

                      {progress >= 25 && (
                        <div className="term-line-1 pl-3 border-l border-white/15 py-1 space-y-1 text-white/70">
                          <div>name: <span className="text-white font-semibold">&quot;{selectedPreset.name}&quot;</span></div>
                          <div>symbol: <span className="text-[#cadcf0] font-semibold">{selectedPreset.symbol}</span></div>
                        </div>
                      )}

                      {progress >= 50 && (
                        <div className="term-line-2 pl-3 border-l border-white/15 py-0.5 space-y-1 text-white/70">
                          <div>target_supply: <span className="text-white">{selectedPreset.supply}</span></div>
                          <div>curve_model: <span className="text-white">{selectedPreset.curve}</span></div>
                        </div>
                      )}

                      {progress >= 78 && (
                        <div className="term-line-3 text-white/95 text-[11px] mt-2 flex items-center gap-1.5 font-semibold">
                          <Check className="w-3.5 h-3.5 text-[#fae8a4]" />
                          <span>[OK] Parameters compiled into immutable genesis payload</span>
                          {progress < 95 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                        </div>
                      )}
                    </>
                  )}

                  {activeStage === 1 && (
                    <>
                      <div className="text-white/40">{"//"} [00:00.12] Smart Contract Bytecode Integrity:</div>
                      <div className="text-[#fae8a4] flex items-center">
                        <span>&gt; solc.verifyBytecode(ERC20Sovereign.sol)</span>
                        {progress < 25 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                      </div>

                      {progress >= 25 && (
                        <div className="term-line-1 pl-3 border-l border-white/15 py-1 space-y-1 text-white/70">
                          <div>constructor_supply: <span className="text-white">999,000,000 * 10^18</span></div>
                          <div>ownership_status: <span className="text-white">address(0) [RENOUNCED]</span></div>
                        </div>
                      )}

                      {progress >= 50 && (
                        <div className="term-line-2 pl-3 border-l border-white/15 py-0.5 space-y-1 text-white/70">
                          <div>mint_selector: <span className="text-[#fae8a4]">0x00000000 (NOT IMPLEMENTED)</span></div>
                          <div>platform_tax: <span className="text-white">0.00% (IMMUTABLE)</span></div>
                        </div>
                      )}

                      {progress >= 78 && (
                        <>
                          {auditTest === 'mint' ? (
                            <div className="term-line-3 mt-2 p-2 bg-red-950/60 border border-red-500/30 rounded-[2px] text-red-300 text-[11px]">
                              [SECURITY REVERT] execute: mint(to, 1000000)<br />
                              ↳ REVERT: 0x4e487b71 (Function signature does not exist)
                            </div>
                          ) : auditTest === 'owner' ? (
                            <div className="term-line-3 mt-2 p-2 bg-amber-950/60 border border-amber-500/30 rounded-[2px] text-amber-200 text-[11px]">
                              [SECURITY REVERT] execute: setTaxFee(0.05)<br />
                              ↳ REVERT: Caller is not owner. Owner is address(0).
                            </div>
                          ) : (
                            <div className="term-line-3 text-white/95 text-[11px] mt-2 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-[#fae8a4]" />
                              <span>[PASS] 0 backdoors detected in compiled bytecode</span>
                              {progress < 95 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {activeStage === 2 && (
                    <>
                      <div className="text-white/40">{"//"} [00:00.15] Liquidity Settlement Routing:</div>
                      <div className="text-[#fae8a4] flex items-center">
                        <span>&gt; {activeNetwork === 'robinhood' ? 'UniswapV2Factory.createPair()' : 'pump.fun.initializeAMM()'}</span>
                        {progress < 25 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                      </div>

                      {progress >= 25 && (
                        <div className="term-line-1 pl-3 border-l border-white/15 py-1 space-y-1 text-white/70 text-[11px]">
                          <div>chain: <span className="text-white font-semibold">{activeNetwork === 'robinhood' ? 'Robinhood EVM (Chain ID 4663)' : 'Solana Mainnet'}</span></div>
                          <div>router: <span className="text-[#cadcf0]">{activeNetwork === 'robinhood' ? (HOOD_MAINNET.router?.slice(0, 18) ?? '0x89e5db8b5aa49aa') + '...' : 'pump...4M5u'}</span></div>
                        </div>
                      )}

                      {progress >= 50 && (
                        <div className="term-line-2 pl-3 border-l border-white/15 py-0.5 space-y-1 text-white/70 text-[11px]">
                          <div>lp_destination: <span className="text-[#fae8a4]">0x000000000000000000000000000000000000dead</span></div>
                          <div>rugpull_prevention: <span className="text-white">LIQUIDITY PERMANENTLY LOCKED</span></div>
                        </div>
                      )}

                      {progress >= 78 && (
                        <div className="term-line-3 text-white/95 text-[11px] mt-2 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#fae8a4]" />
                          <span>[ACTIVE] Autonomous pool initialized onchain</span>
                          {progress < 95 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                        </div>
                      )}
                    </>
                  )}

                  {activeStage === 3 && (
                    <>
                      <div className="text-white/40">{"//"} [00:00.18] Local Cryptographic Signing:</div>
                      <div className="text-[#fae8a4] flex items-center">
                        <span>&gt; window.ethereum.request(&#123; method: &apos;eth_sendRawTransaction&apos; &#125;)</span>
                        {progress < 25 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                      </div>

                      {progress >= 25 && (
                        <div className="term-line-1 pl-3 border-l border-white/15 py-1 space-y-1 text-white/70 text-[11px]">
                          <div>client_provider: <span className="text-white">Injected Web3 Wallet</span></div>
                          <div>key_isolation: <span className="text-[#fae8a4]">100% Non-Custodial</span></div>
                        </div>
                      )}

                      {progress >= 50 && (
                        <div className="term-line-2 pl-3 border-l border-white/15 py-0.5 space-y-1 text-white/70 text-[11px]">
                          <div>server_data_transit: <span className="text-white">0 bytes (Zero Private Keys Stored)</span></div>
                          <div>signature_type: <span className="text-white">ECDSA secp256k1</span></div>
                        </div>
                      )}

                      {progress >= 78 && (
                        <div className="term-line-3 text-white/95 text-[11px] mt-2 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#fae8a4]" />
                          <span>[BROADCAST] Transaction signed locally and broadcasted</span>
                          {progress < 95 && <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-1.5" />}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Active Shell Prompt with Blinking Cursor */}
                <div className="pt-3 mt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-white/40">artemis@node:~$</span>
                  <span className="text-[#fae8a4]">
                    {activeStage === 0 && `copilot.synthesize("${selectedPreset.tag}")`}
                    {activeStage === 1 && `solc.verify --fixed-supply`}
                    {activeStage === 2 && `router.routeAMM --network=${activeNetwork}`}
                    {activeStage === 3 && `eip712.signLocal --offline`}
                  </span>
                  <span className="inline-block w-1.5 h-3.5 bg-[#fae8a4] animate-pulse ml-0.5" />
                </div>
              </div>

              {/* Terminal Bottom Telemetry Status (Clean, zero green dot) */}
              <div className="mt-8 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono">
                <div className="flex items-center gap-2">
                  <span>GAS: &lt; 0.001 ETH</span>
                  <span>·</span>
                  <span>CONFIRMATION: INSTANT</span>
                </div>
                <div>ARTEMIS_KERNEL_V1</div>
              </div>
            </div>

          </div>
        </div>

        {/* Principle Strip Marquee (Retained & Smoothly Animated) */}
        <div className="principle-strip mt-14 pt-8 border-t border-[#18191c]/10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#18191c]/60 whitespace-nowrap font-bold">
            SOVEREIGN PRINCIPLES:
          </p>

          <div className="principle-marquee flex-1 overflow-hidden select-none">
            <div className="principle-track font-mono text-xs sm:text-sm tracking-widest text-[#18191c]/75">
              <span className="px-6">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
              <span className="px-6" aria-hidden="true">FIXED SUPPLY · ZERO MINTING · NO OWNER ROLES · SOVEREIGN LIQUIDITY · 100% NON-CUSTODIAL ·</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
