import { useState, useEffect, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'

const COMMITTEES = [
  { id: 'UNGA',  label: 'UNGA — United Nations General Assembly' },
  { id: 'UNCSW', label: 'UNCSW — UN Commission on the Status of Women' },
  { id: 'UNHRC', label: 'UNHRC — UN Human Rights Council' },
  { id: 'AIPPM', label: 'AIPPM — All India Political Parties Meet' },
  { id: 'IPL',   label: 'IPL — Indian Premier League' },
  { id: 'IP',    label: 'IP — International Press' },
  { id: 'USSIC', label: 'USSIC — US Senate Intelligence Committee' },
]

const BANK = {
  name: 'Joginder Jhamb',
  account: '10000000908043',
  ifsc: 'JIOP0000001',
  upi: '9811588040@ptyes',
  amount: '₹1,600',
}

const STEPS = ['Identification', 'Delegation', 'Documentation']

/* ── Photo scenes per step ── */
const STEP_SCENES = [
  {
    /* Step 0: Identity — close-up debate photographs */
    stamp: 'IDENTITY CONFIRMED',
    label: 'Identity Clearance Protocol',
    primary: {
      src: '/brand-assets/72A92FE4-7AD2-41D9-8D3A-A497D7EF1230_1_105_c.jpeg',
      left:'8%', top:'10%', w:'52%', h:'60%',
      clip:[[38,0],[100,18],[64,100],[0,82]], pos:'center 22%',
      stroke:'rgba(155,110,9,0.65)',
    },
    secondary: {
      src: '/brand-assets/4AC1B940-6A42-4DA7-801E-E3DB7637AE95_1_105_c.jpeg',
      left:'52%', top:'6%', w:'42%', h:'40%',
      clip:[[22,0],[100,14],[80,100],[0,78]], pos:'center 15%',
      stroke:'rgba(155,110,9,0.28)',
    },
    accent: {
      src: '/brand-assets/7E510A86-748D-42E3-A502-1C27114879CA_1_105_c.jpeg',
      left:'18%', top:'62%', w:'48%', h:'30%',
      clip:[[0,20],[100,4],[100,80],[0,96]], pos:'center 60%',
      stroke:'none',
    },
  },
  {
    /* Step 1: Delegation — committee room photographs */
    stamp: 'DELEGATION LOGGED',
    label: 'Delegation Assignment Protocol',
    primary: {
      src: '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
      left:'8%', top:'10%', w:'52%', h:'60%',
      clip:[[38,0],[100,18],[64,100],[0,82]], pos:'center 38%',
      stroke:'rgba(155,110,9,0.65)',
    },
    secondary: {
      src: '/brand-assets/BC90F61B-5C87-4AC1-96D6-D67F79C1AF97_4_5005_c.jpeg',
      left:'52%', top:'6%', w:'42%', h:'40%',
      clip:[[22,0],[100,14],[80,100],[0,78]], pos:'center 35%',
      stroke:'rgba(155,110,9,0.28)',
    },
    accent: {
      src: '/brand-assets/0E0C117E-396D-4805-872C-03ABDE0AE155_4_5005_c.jpeg',
      left:'18%', top:'62%', w:'48%', h:'30%',
      clip:[[0,20],[100,4],[100,80],[0,96]], pos:'center 50%',
      stroke:'none',
    },
  },
  {
    /* Step 2: Documentation — ceremony/award photographs */
    stamp: 'DOCUMENTATION FILED',
    label: 'Documentation & Payment Protocol',
    primary: {
      src: '/brand-assets/5771A8D9-88FD-4A2A-9889-3E2CDA237CF6_4_5005_c.jpeg',
      left:'8%', top:'10%', w:'52%', h:'60%',
      clip:[[38,0],[100,18],[64,100],[0,82]], pos:'center 40%',
      stroke:'rgba(155,110,9,0.65)',
    },
    secondary: {
      src: '/brand-assets/D655973D-D18C-4556-9589-3B8169E4425E_1_105_c.jpeg',
      left:'52%', top:'6%', w:'42%', h:'40%',
      clip:[[22,0],[100,14],[80,100],[0,78]], pos:'center 25%',
      stroke:'rgba(155,110,9,0.28)',
    },
    accent: {
      src: '/brand-assets/8EBB4AE6-A558-4DE7-B19F-1696CDE96607_4_5005_c.jpeg',
      left:'18%', top:'62%', w:'48%', h:'30%',
      clip:[[0,20],[100,4],[100,80],[0,96]], pos:'center 45%',
      stroke:'none',
    },
  },
]

const CEREMONY_PHOTOS = [
  { src:'/brand-assets/5A1171F6-5AA9-4F1C-AED8-33882BA1F89D_4_5005_c.jpeg', left:'48%', top:'8%',  w:'30%', h:'55%', clip:[[36,0],[100,16],[66,100],[0,84]], pos:'center 35%', stroke:'rgba(155,110,9,0.65)', delay:0,   blur:0,  op:0.75 },
  { src:'/brand-assets/DAE14D04-04CF-4105-83B9-8DD7736C3488_4_5005_c.jpeg', left:'72%', top:'5%',  w:'22%', h:'36%', clip:[[20,0],[100,12],[82,100],[0,80]], pos:'center 28%', stroke:'rgba(155,110,9,0.28)', delay:0.2, blur:0,  op:0.62 },
  { src:'/brand-assets/B3C9A915-88E4-4549-A99F-464AFB01C1F5_1_105_c.jpeg', left:'58%', top:'54%', w:'26%', h:'32%', clip:[[0,20],[100,4],[100,80],[0,96]],  pos:'center 50%', stroke:'rgba(155,110,9,0.22)', delay:0.4, blur:0,  op:0.55 },
  { src:'/brand-assets/79BC2A0E-D55B-44F2-8C68-6E2ECA3D4992_1_105_c.jpeg', left:'80%', top:'28%', w:'14%', h:'40%', clip:[[18,0],[100,10],[84,100],[0,88]], pos:'center 45%', stroke:'none',                 delay:0.6, blur:0,  op:0.45 },
  { src:'/brand-assets/8F699AEC-A89B-481A-8831-A1F993AE79FE_4_5005_c.jpeg', left:'44%', top:'18%', w:'40%', h:'52%', clip:[[6,4],[96,0],[100,94],[4,100]],   pos:'center 40%', stroke:'none',                 delay:0.8, blur:9,  op:0.16 },
]

const css = `
/* ── Page ── */
.rf-page {
  min-height: 100vh;
  background: #050402;
  font-family: 'Poppins', sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Topbar ── */
.rf-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 14px 8vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(155,110,9,0.08);
  background: rgba(5,4,2,0.96);
  backdrop-filter: blur(14px);
}
.rf-topbar-back {
  display: flex; align-items: center; gap: 10px;
  font-size: 7.5px; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--muted);
  opacity: 0.48; text-decoration: none; transition: opacity 0.2s;
}
.rf-topbar-back:hover { opacity: 0.9; }
.rf-topbar-back-line {
  width: 16px; height: 1px; background: currentColor; position: relative;
}
.rf-topbar-back-line::before {
  content: ''; position: absolute; left: 0; top: -3px;
  width: 5px; height: 5px;
  border-left: 1px solid currentColor; border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
}
.rf-topbar-logo {
  height: 24px; width: auto; opacity: 0.82;
  position: absolute; left: 50%; transform: translateX(-50%);
}
.rf-topbar-meta {
  font-size: 7.5px; letter-spacing: 0.4em;
  text-transform: uppercase; color: var(--gold); opacity: 0.38;
}

/* ── Progress ── */
.rf-progress-strip {
  height: 1px;
  background: rgba(155,110,9,0.1);
  position: relative;
  flex-shrink: 0;
}
.rf-progress-fill {
  position: absolute; left: 0; top: 0; height: 100%;
  background: var(--gold);
  transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
}

/* ── Split layout ── */
.rf-layout {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

/* ── Form panel (left) ── */
.rf-form-panel {
  position: relative;
  z-index: 5;
  width: 56%;
  min-width: 360px;
  padding: 48px 4vw 80px 8vw;
  background: linear-gradient(
    to right,
    rgba(5,4,2,1) 0%,
    rgba(5,4,2,0.99) 60%,
    rgba(5,4,2,0.9) 82%,
    rgba(5,4,2,0.72) 100%
  );
  overflow-y: auto;
}

/* ── Photo stage (right) ── */
.rf-photo-stage {
  flex: 1;
  position: sticky;
  top: 57px;
  height: calc(100vh - 57px);
  overflow: hidden;
}

/* Stage left veil — blends form edge into photos */
.rf-stage-veil {
  position: absolute;
  inset: 0;
  z-index: 8;
  background:
    linear-gradient(to right, rgba(5,4,2,0.88) 0%, rgba(5,4,2,0.35) 22%, transparent 48%),
    linear-gradient(to bottom, rgba(5,4,2,0.28) 0%, transparent 12%, transparent 88%, rgba(5,4,2,0.28) 100%);
  pointer-events: none;
}

/* Stage classification label */
.rf-stage-label {
  position: absolute;
  bottom: 28px; right: 22px;
  z-index: 15;
  font-family: 'Poppins', sans-serif;
  font-size: 6.5px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.22;
  pointer-events: none;
  text-align: right;
  line-height: 2;
}

/* ── Photo shard ── */
.rf-photo-shard {
  position: absolute;
}
.rf-photo-shard-inner {
  position: relative;
  width: 100%; height: 100%;
}
.rf-photo-shard-img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: sepia(0.4) saturate(0.5) brightness(0.28);
  display: block;
}
.rf-photo-shard-tint {
  position: absolute; inset: 0;
  background: linear-gradient(145deg, rgba(155,110,9,0.14) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.44) 100%);
  z-index: 2; pointer-events: none;
}
.rf-photo-shard-vignette {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.52) 100%);
  z-index: 3; pointer-events: none;
}
.rf-photo-border-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  overflow: visible; z-index: 10;
  pointer-events: none;
}

/* ── Stamp overlay ── */
.rf-stamp-overlay {
  position: fixed; inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(5,4,2,0.18);
}
.rf-stamp-inner {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 4vw, 3.8rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
  border: 2.5px solid var(--gold);
  padding: 12px 30px;
  transform: rotate(-7deg);
  user-select: none;
  opacity: 0.22;
}

/* ── Steps strip ── */
.rf-steps-strip {
  display: flex;
  align-items: center;
  margin-bottom: 42px;
}
.rf-step-item {
  display: flex; align-items: center; gap: 10px;
  color: var(--muted); opacity: 0.25;
  transition: opacity 0.35s, color 0.35s; flex-shrink: 0;
}
.rf-step-item.active { color: var(--gold); opacity: 1; }
.rf-step-item.done   { color: var(--gold); opacity: 0.45; }
.rf-step-num {
  width: 20px; height: 20px;
  border: 1px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 500; flex-shrink: 0;
  transition: background 0.3s, color 0.3s;
}
.rf-step-item.active .rf-step-num { background: var(--gold); color: #000; border-color: var(--gold); }
.rf-step-item.done   .rf-step-num { background: rgba(155,110,9,0.14); }
.rf-step-name {
  font-size: 7px; letter-spacing: 0.38em; text-transform: uppercase;
}
.rf-step-connector {
  flex: 1; height: 1px;
  background: rgba(155,110,9,0.15);
  margin: 0 10px; min-width: 14px; max-width: 32px;
}

/* ── Step header ── */
.rf-step-classification {
  font-size: 6.5px; letter-spacing: 0.5em;
  text-transform: uppercase; color: var(--gold); opacity: 0.3;
  margin-bottom: 8px; display: block;
}
.rf-step-meta {
  font-size: 7px; letter-spacing: 0.44em;
  text-transform: uppercase; color: var(--gold); opacity: 0.42;
  margin-bottom: 14px; display: block;
}
.rf-step-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.5vw, 3.8rem);
  line-height: 0.88;
  letter-spacing: -0.035em;
  color: #e8e4dc;
  margin: 0 0 12px;
}
.rf-step-sub {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.1rem;
  color: #c8bba0;
  opacity: 0.88;
  margin: 0 0 44px;
  line-height: 1.55;
}

/* ── Inner form container ── */
.rf-inner { width: 100%; max-width: 520px; }

/* ── Fields ── */
.rf-field { margin-bottom: 32px; position: relative; }
.rf-field-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 24px; margin-bottom: 32px;
}
.rf-label {
  display: block; font-size: 7px;
  letter-spacing: 0.44em; text-transform: uppercase;
  color: var(--gold); opacity: 0.52; margin-bottom: 8px;
}
.rf-input, .rf-select, .rf-textarea {
  width: 100%; box-sizing: border-box;
  background: transparent; border: none;
  border-bottom: 1px solid rgba(155,110,9,0.2);
  padding: 10px 0;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-size: 16px;
  color: #e8e4dc; outline: none;
  transition: border-color 0.25s ease;
  -webkit-appearance: none; appearance: none;
}
.rf-input:focus, .rf-select:focus { border-bottom-color: rgba(155,110,9,0.7); }
.rf-input::placeholder { color: var(--muted); opacity: 0.3; font-style: italic; }
.rf-input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px #050402 inset;
  -webkit-text-fill-color: #e8e4dc;
  caret-color: #e8e4dc;
}
.rf-select {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239b6e09' stroke-opacity='.5' stroke-width='1'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  padding-right: 20px;
}
.rf-select option { background: #0a0804; color: #e8e4dc; font-style: normal; }
.rf-hint {
  font-size: 10px; color: var(--muted); opacity: 0.4;
  margin-top: 6px; line-height: 1.6; font-style: italic;
}
.rf-error { font-size: 10px; color: #c87070; margin-top: 5px; display: block; }
.rf-divider {
  border: none; border-top: 1px solid rgba(155,110,9,0.08); margin: 36px 0;
}
.rf-sub-label {
  font-size: 7px; letter-spacing: 0.44em;
  text-transform: uppercase; color: var(--gold);
  opacity: 0.4; margin-bottom: 20px; display: block;
}

/* ── File upload ── */
.rf-upload-area {
  border: 1px solid rgba(155,110,9,0.18); padding: 28px 20px;
  text-align: center; cursor: pointer;
  transition: border-color 0.25s, background 0.25s; position: relative;
}
.rf-upload-area:hover { border-color: rgba(155,110,9,0.45); background: rgba(155,110,9,0.02); }
.rf-upload-area.uploaded { border-color: rgba(155,110,9,0.4); background: rgba(155,110,9,0.025); }
.rf-upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.rf-upload-icon { font-size: 20px; color: var(--gold); opacity: 0.35; margin-bottom: 10px; display: block; }
.rf-upload-label {
  font-size: 8.5px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--cream); opacity: 0.55;
  display: block; margin-bottom: 5px;
}
.rf-upload-hint { font-size: 10px; color: var(--muted); opacity: 0.38; }
.rf-upload-name { font-size: 11px; color: var(--gold); opacity: 0.75; margin-top: 6px; display: block; }

/* ── Payment ── */
.rf-payment-section { margin-bottom: 36px; }
.rf-qr-wrap { display: flex; gap: 32px; align-items: flex-start; margin-bottom: 28px; }
.rf-qr-box {
  border: 1px solid rgba(155,110,9,0.2); padding: 16px;
  background: rgba(255,255,255,0.04); flex-shrink: 0;
}
.rf-qr-img { width: 130px; height: 130px; display: block; }
.rf-bank-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid rgba(155,110,9,0.06); gap: 16px;
}
.rf-bank-row:last-child { border-bottom: none; }
.rf-bank-key {
  font-size: 7px; letter-spacing: 0.38em;
  text-transform: uppercase; color: var(--gold); opacity: 0.45; flex-shrink: 0;
}
.rf-bank-val {
  font-family: 'Courier New', monospace;
  font-size: 12px; color: #e8e4dc; opacity: 0.8; text-align: right;
}

/* ── ToS ── */
.rf-tos-wrap {
  margin-bottom: 28px; padding: 18px 20px;
  border: 1px solid rgba(155,110,9,0.12);
  background: rgba(155,110,9,0.018);
}
.rf-tos-row {
  display: flex; align-items: flex-start; gap: 14px;
  cursor: pointer; user-select: none;
}
.rf-tos-hidden { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
.rf-tos-box {
  flex-shrink: 0; width: 14px; height: 14px;
  border: 1px solid rgba(155,110,9,0.4);
  position: relative;
  transition: border-color 0.25s, background 0.25s; margin-top: 1px;
}
.rf-tos-box.checked { background: var(--gold); border-color: var(--gold); }
.rf-tos-box.checked::after {
  content: ''; position: absolute; left: 2px; top: 0px;
  width: 6px; height: 9px;
  border-right: 1.5px solid #000; border-bottom: 1.5px solid #000;
  transform: rotate(45deg);
}
.rf-tos-text {
  font-family: 'Poppins', sans-serif; font-size: 9.5px;
  line-height: 1.75; color: #a89878; letter-spacing: 0.02em;
}
.rf-tos-text a { color: var(--gold); text-decoration: none; border-bottom: 1px solid rgba(155,110,9,0.35); }

/* ── Nav buttons ── */
.rf-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 48px; padding-top: 24px;
  border-top: 1px solid rgba(155,110,9,0.08);
}
.rf-btn-back {
  font-size: 7.5px; letter-spacing: 0.36em; text-transform: uppercase;
  color: var(--muted); opacity: 0.45;
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; gap: 10px; transition: opacity 0.2s;
}
.rf-btn-back:hover { opacity: 0.85; }
.rf-btn-proceed {
  background: var(--gold); color: #000;
  font-family: 'Poppins', sans-serif; font-size: 8.5px; font-weight: 500;
  letter-spacing: 0.32em; text-transform: uppercase;
  border: none; padding: 15px 32px;
  cursor: pointer; transition: opacity 0.2s;
}
.rf-btn-proceed:hover:not(:disabled) { opacity: 0.82; }
.rf-btn-proceed:disabled { opacity: 0.35; cursor: default; }

/* ── Credential screen ── */
.rf-credential-wrap {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 8vw 80px;
  overflow: hidden;
}
.rf-ceremony-layer {
  position: absolute; inset: 0;
  pointer-events: none;
}
.rf-ceremony-veil {
  position: absolute; inset: 0; z-index: 2;
  background:
    radial-gradient(ellipse 60% 80% at 50% 50%, rgba(5,4,2,0.72) 0%, rgba(5,4,2,0.2) 100%),
    linear-gradient(to bottom, rgba(5,4,2,0.5) 0%, transparent 25%, transparent 75%, rgba(5,4,2,0.5) 100%);
  pointer-events: none;
}
.rf-credential-inner {
  position: relative; z-index: 5;
  display: flex; flex-direction: column; align-items: center;
  width: 100%;
}
.rf-credential-eyebrow {
  font-size: 7.5px; letter-spacing: 0.5em;
  text-transform: uppercase; color: var(--gold); opacity: 0.45;
  margin-bottom: 16px;
}
.rf-credential-title {
  font-family: 'Montserrat', sans-serif; font-weight: 900;
  font-size: clamp(2.2rem, 5vw, 3.5rem); letter-spacing: -0.04em;
  color: #e8e4dc; margin: 0 0 40px; text-align: center;
}
.rf-pass {
  width: 100%; max-width: 520px;
  border: 1px solid rgba(155,110,9,0.25);
  background: rgba(8,6,4,0.95); position: relative; overflow: hidden;
}
.rf-pass-top {
  background: linear-gradient(135deg, rgba(155,110,9,0.12) 0%, transparent 60%);
  border-bottom: 1px solid rgba(155,110,9,0.15);
  padding: 28px 28px 22px;
  display: flex; align-items: center; justify-content: space-between;
}
.rf-pass-logo-line {
  font-size: 7px; letter-spacing: 0.42em;
  text-transform: uppercase; color: var(--gold); opacity: 0.5;
}
.rf-pass-conf {
  font-family: 'Montserrat', sans-serif; font-weight: 900;
  font-size: 1rem; letter-spacing: 0.06em; color: #e8e4dc; opacity: 0.8;
}
.rf-pass-body { padding: 28px; display: flex; gap: 28px; align-items: flex-start; }
.rf-pass-info { flex: 1; }
.rf-pass-field { margin-bottom: 20px; }
.rf-pass-field-key {
  font-size: 6.5px; letter-spacing: 0.44em;
  text-transform: uppercase; color: var(--gold); opacity: 0.42;
  display: block; margin-bottom: 4px;
}
.rf-pass-field-val {
  font-family: 'Montserrat', sans-serif; font-weight: 700;
  font-size: 15px; color: #e8e4dc; letter-spacing: 0.01em;
}
.rf-pass-field-val.mono {
  font-family: 'Courier New', monospace; font-size: 13px;
  letter-spacing: 0.12em; color: var(--gold); opacity: 0.9;
}
.rf-pass-field-val.status {
  font-size: 10px; letter-spacing: 0.28em;
  color: rgba(155,110,9,0.7); border: 1px solid rgba(155,110,9,0.25);
  display: inline-block; padding: 4px 12px;
}
.rf-pass-qr {
  flex-shrink: 0; border: 1px solid rgba(155,110,9,0.18);
  padding: 12px; background: rgba(255,255,255,0.03);
}
.rf-pass-footer {
  border-top: 1px solid rgba(155,110,9,0.1); padding: 16px 28px;
  display: flex; align-items: center; justify-content: space-between;
}
.rf-pass-date {
  font-size: 8px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--muted); opacity: 0.35;
}
.rf-pass-type-badge {
  font-size: 7px; letter-spacing: 0.36em; text-transform: uppercase;
  border: 1px solid rgba(155,110,9,0.2); color: var(--gold); opacity: 0.55; padding: 3px 10px;
}
.rf-credential-note {
  max-width: 520px; width: 100%; margin-top: 28px;
  font-size: 10px; line-height: 1.9;
  color: var(--muted); opacity: 0.45; font-style: italic;
}
.rf-credential-actions { display: flex; gap: 12px; margin-top: 32px; }
.rf-action-btn {
  font-size: 8px; letter-spacing: 0.34em; text-transform: uppercase;
  border: 1px solid rgba(155,110,9,0.25); color: var(--gold); opacity: 0.65;
  padding: 12px 22px; background: none; cursor: pointer;
  transition: opacity 0.2s, border-color 0.2s; text-decoration: none;
}
.rf-action-btn:hover { opacity: 1; border-color: rgba(155,110,9,0.55); }
.rf-action-btn.primary { background: var(--gold); color: #000; opacity: 1; border-color: transparent; }
.rf-action-btn.primary:hover { opacity: 0.82; }

/* ── Page footer ── */
.rf-page-footer {
  position: relative; z-index: 5;
  border-top: 1px solid rgba(155,110,9,0.07);
  padding: 20px 8vw 18px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  background: rgba(5,4,2,0.55);
}
.rf-page-footer-left { display: flex; align-items: center; gap: 14px; }
.rf-page-footer-logo { height: 22px; width: auto; opacity: 0.55; }
.rf-page-footer-info { display: flex; flex-direction: column; gap: 2px; }
.rf-page-footer-name {
  font-family: 'Montserrat', sans-serif; font-weight: 700;
  font-size: 8.5px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--cream); opacity: 0.55;
}
.rf-page-footer-meta {
  font-size: 7.5px; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--muted); opacity: 0.38;
}
.rf-page-footer-right { display: flex; align-items: center; gap: 10px; }
.rf-page-footer-link {
  font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--muted); opacity: 0.4; text-decoration: none;
  transition: opacity 0.2s, color 0.2s;
}
.rf-page-footer-link:hover { opacity: 0.78; color: var(--gold); }
.rf-page-footer-sep { color: var(--muted); opacity: 0.2; font-size: 8px; }

/* ── Mobile ── */
@media (max-width: 800px) {
  .rf-layout { flex-direction: column; }
  .rf-form-panel { width: 100%; min-width: unset; padding: 36px 20px 60px; background: rgba(5,4,2,1); }
  .rf-photo-stage { display: none; }
  .rf-credential-wrap { padding: 36px 20px 56px; }
  .rf-qr-wrap { flex-direction: column; gap: 20px; }
  .rf-qr-img { width: 110px; height: 110px; }
  .rf-pass-body { flex-direction: column; gap: 20px; }
  .rf-pass { max-width: 100%; }
  .rf-field-row { grid-template-columns: 1fr; gap: 0; }
  .rf-topbar { padding: 12px 20px; }
  .rf-page-footer { padding: 16px 20px 14px; flex-direction: column; align-items: flex-start; gap: 12px; }
  .rf-topbar-logo { height: 20px; }
}
`

/* ── Photo shard component ── */
function PhotoShard({ photo, open, bright, delay = 0, step }) {
  const clipOpen   = `polygon(${photo.clip.map(([x,y]) => `${x}% ${y}%`).join(', ')})`
  const clipClosed = `polygon(${photo.clip.map(() => '50% 48%').join(', ')})`
  const svgPoints  = photo.clip.map(([x,y]) => `${x},${y}`).join(' ')

  return (
    <motion.div
      className="rf-photo-shard"
      style={{ left: photo.left, top: photo.top, width: photo.w, height: photo.h, zIndex: 5 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? (bright ? 0.82 : 0.42) : 0.06 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rf-photo-shard-inner">
        <motion.div
          style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
          animate={{ clipPath: open ? clipOpen : clipClosed }}
          transition={{ duration: 1.0, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            className="rf-photo-shard-img"
            src={photo.src}
            alt=""
            style={{
              objectPosition: photo.pos,
              filter: `sepia(0.4) saturate(0.5) brightness(${open && bright ? 0.42 : 0.22})`,
              transition: 'filter 0.8s ease',
            }}
          />
          <div className="rf-photo-shard-tint" />
          <div className="rf-photo-shard-vignette" />
        </motion.div>

        {photo.stroke !== 'none' && (
          <motion.svg
            className="rf-photo-border-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            animate={{ opacity: open ? 1 : 0.18 }}
            transition={{ duration: 0.5, delay }}
          >
            <polygon
              points={svgPoints}
              fill="none"
              stroke={photo.stroke}
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          </motion.svg>
        )}
      </div>
    </motion.div>
  )
}

/* ── Photo stage ── */
function PhotoStage({ step, fieldFocused }) {
  const scene = STEP_SCENES[Math.min(step, 2)]

  return (
    <div className="rf-photo-stage">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          style={{ position: 'absolute', inset: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhotoShard photo={scene.primary}   open={true}         bright={!fieldFocused} delay={0}    step={step} />
          <PhotoShard photo={scene.secondary} open={fieldFocused} bright={true}           delay={0.12} step={step} />
          <PhotoShard photo={scene.accent}    open={true}         bright={false}          delay={0.3}  step={step} />
        </motion.div>
      </AnimatePresence>

      <div className="rf-stage-veil" />

      <div className="rf-stage-label">
        {scene.label}<br />
        Mosaic MUN II · Edition II<br />
        Ref: MUN-II-SGS-2026
      </div>
    </div>
  )
}

/* ── Ceremony photos (credential screen) ── */
function CeremonyLayer() {
  const clipFor = (clip) => `polygon(${clip.map(([x,y]) => `${x}% ${y}%`).join(', ')})`
  const closedFor = (clip) => `polygon(${clip.map(() => '50% 48%').join(', ')})`

  return (
    <div className="rf-ceremony-layer">
      {CEREMONY_PHOTOS.map((p, i) => {
        const open   = clipFor(p.clip)
        const closed = closedFor(p.clip)
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: p.left, top: p.top, width: p.w, height: p.h,
              zIndex: 1,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: p.op }}
            transition={{ duration: 1.2, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <motion.div
                style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                initial={{ clipPath: closed }}
                animate={{ clipPath: open }}
                transition={{ duration: 1.1, delay: p.delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <img src={p.src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:p.pos, filter:'sepia(0.35) saturate(0.5) brightness(0.3)' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg, rgba(155,110,9,0.14) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.44) 100%)', zIndex:2 }} />
              </motion.div>
              {p.stroke !== 'none' && (
                <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible', zIndex:10 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon points={p.clip.map(([x,y]) => `${x},${y}`).join(' ')} fill="none" stroke={p.stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                </svg>
              )}
            </div>
          </motion.div>
        )
      })}
      <div className="rf-ceremony-veil" />
    </div>
  )
}

const uploadFile = async (file, regId, type) => {
  const ext = file.name.split('.').pop()
  const path = `${regId}/${type}.${ext}`
  const { error } = await supabase.storage.from('registration-files').upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export default function RegisterSGS() {
  const [step, setStep]               = useState(0)
  const [dir,  setDir]                = useState(1)
  const [errors, setErrors]           = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [registration, setRegistration] = useState(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [fieldFocused, setFieldFocused]   = useState(false)
  const [stampText, setStampText]         = useState('')
  const [showStamp, setShowStamp]         = useState(false)

  const [form, setForm] = useState({
    full_name: '', class_year: '', email: '', phone: '', mun_count: '',
    committee_pref_1: '', committee_pref_2: '', committee_pref_3: '',
    portfolio_pref_1: '', portfolio_pref_2: '', portfolio_pref_3: '',
    id_card: null, payment_screenshot: null,
  })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!form.full_name.trim())  e.full_name  = 'Full name is required.'
      if (!form.class_year.trim()) e.class_year = 'Class and section is required.'
      if (!form.email.trim())      e.email      = 'Email address is required.'
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
      if (!form.phone.trim())      e.phone      = 'Phone number is required.'
    }
    if (step === 1) {
      if (!form.committee_pref_1) e.committee_pref_1 = 'First committee preference is required.'
    }
    if (step === 2) {
      if (!form.payment_screenshot) e.payment_screenshot = 'Payment screenshot is required.'
      if (!form.id_card)             e.id_card            = 'School ID card is required.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const fireStamp = (text, cb) => {
    setStampText(text)
    setShowStamp(true)
    setTimeout(() => {
      setShowStamp(false)
      cb()
    }, 850)
  }

  const next = () => {
    if (!validate()) return
    const stamps = ['IDENTITY CONFIRMED', 'DELEGATION LOGGED']
    fireStamp(stamps[step], () => {
      setDir(1)
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const back = () => {
    setDir(-1)
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      // Generate registration_id client-side so credential screen works without a SELECT
      const regId = `SGS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      let idCardPath = null
      let paymentPath = null

      if (form.id_card)            idCardPath  = await uploadFile(form.id_card, regId, 'id_card')
      if (form.payment_screenshot) paymentPath = await uploadFile(form.payment_screenshot, regId, 'payment')

      const { error } = await supabase.from('registrations').insert({
        registration_id:  regId,
        type: 'sgs',
        full_name:        form.full_name.trim(),
        institution:      'Saraswati Global School',
        class_year:       form.class_year.trim(),
        email:            form.email.trim().toLowerCase(),
        phone:            form.phone.trim(),
        mun_count:        form.mun_count ? parseInt(form.mun_count, 10) : 0,
        committee_pref_1: form.committee_pref_1 || null,
        committee_pref_2: form.committee_pref_2 || null,
        committee_pref_3: form.committee_pref_3 || null,
        portfolio_pref_1: form.portfolio_pref_1.trim() || null,
        portfolio_pref_2: form.portfolio_pref_2.trim() || null,
        portfolio_pref_3: form.portfolio_pref_3.trim() || null,
        id_card_url:             idCardPath,
        payment_screenshot_url:  paymentPath,
      })

      if (error) throw error

      // Build credential from local state — no SELECT needed (avoids RLS on anon reads)
      setRegistration({
        registration_id: regId,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        institution: 'Saraswati Global School',
      })

      fireStamp('ACCREDITATION ISSUED', () => {
        setDir(1)
        setStep(3)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    } catch (err) {
      console.error('Registration error:', err)
      setErrors({ submit: `Submission failed: ${err?.message || String(err)}` })
    } finally {
      setSubmitting(false)
    }
  }

  const progress = step >= 3 ? 100 : Math.round((step / STEPS.length) * 100)

  const SLIDE = {
    initial: (d) => ({ opacity: 0, x: d > 0 ? 28 : -28 }),
    animate: { opacity: 1, x: 0 },
    exit:    (d) => ({ opacity: 0, x: d > 0 ? -28 : 28 }),
  }

  return (
    <div className="rf-page">
      {/* Stamp overlay */}
      <AnimatePresence>
        {showStamp && (
          <motion.div
            className="rf-stamp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="rf-stamp-inner"
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.06, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {stampText}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="rf-topbar">
        <Link to="/register" className="rf-topbar-back">
          <span className="rf-topbar-back-line" />
          Back
        </Link>
        <img src="/brand-assets/mosaic-logo-nobg.png" className="rf-topbar-logo" alt="Mosaic MUN" />
        <span className="rf-topbar-meta">File 001 · SGS Registration</span>
      </div>

      {/* Progress */}
      <div className="rf-progress-strip">
        <div className="rf-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {step < 3 ? (
        <div className="rf-layout">
          {/* Form panel */}
          <div
            className="rf-form-panel"
            onFocusCapture={() => setFieldFocused(true)}
            onBlurCapture={() => setFieldFocused(false)}
          >
            {/* Step strip */}
            <div className="rf-steps-strip">
              {STEPS.map((label, i) => (
                <Fragment key={label}>
                  <div className={`rf-step-item${i < step ? ' done' : ''}${i === step ? ' active' : ''}`}>
                    <span className="rf-step-num">{i + 1}</span>
                    <span className="rf-step-name">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="rf-step-connector" />}
                </Fragment>
              ))}
            </div>

            <div className="rf-inner">
              <AnimatePresence mode="wait" custom={dir}>
                {step === 0 && (
                  <motion.div key="step0"
                    custom={dir} variants={SLIDE}
                    initial="initial" animate="animate" exit="exit"
                    transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
                  >
                    <span className="rf-step-classification">Restricted · Identity Clearance</span>
                    <span className="rf-step-meta">Page 01 / 03 · Identification</span>
                    <h2 className="rf-step-title">Who<br />are you?</h2>
                    <p className="rf-step-sub">Your identity on record. This is how you enter the chamber.</p>

                    <div className="rf-field">
                      <label className="rf-label" htmlFor="sgs-name">Full Name</label>
                      <input id="sgs-name" className="rf-input" type="text"
                        value={form.full_name}
                        onChange={e => set('full_name', e.target.value)}
                        placeholder="As on school records"
                        autoFocus autoComplete="name"
                      />
                      {errors.full_name && <span className="rf-error">{errors.full_name}</span>}
                    </div>

                    <div className="rf-field">
                      <label className="rf-label" htmlFor="sgs-class">Class &amp; Section</label>
                      <input id="sgs-class" className="rf-input" type="text"
                        value={form.class_year}
                        onChange={e => set('class_year', e.target.value)}
                        placeholder="e.g. Class XI — A"
                        autoComplete="off"
                      />
                      {errors.class_year && <span className="rf-error">{errors.class_year}</span>}
                    </div>

                    <div className="rf-field-row">
                      <div>
                        <label className="rf-label" htmlFor="sgs-email">Email Address</label>
                        <input id="sgs-email" className="rf-input" type="email"
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                          placeholder="your@email.com"
                          autoComplete="email"
                        />
                        {errors.email && <span className="rf-error">{errors.email}</span>}
                      </div>
                      <div>
                        <label className="rf-label" htmlFor="sgs-phone">Phone Number</label>
                        <input id="sgs-phone" className="rf-input" type="tel"
                          value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          autoComplete="tel"
                        />
                        {errors.phone && <span className="rf-error">{errors.phone}</span>}
                      </div>
                    </div>

                    <div className="rf-field">
                      <label className="rf-label" htmlFor="sgs-mun">MUNs Attended</label>
                      <input id="sgs-mun" className="rf-input" type="number"
                        min="0" max="50"
                        value={form.mun_count}
                        onChange={e => set('mun_count', e.target.value)}
                        placeholder="0"
                        autoComplete="off"
                      />
                      <span className="rf-hint">Total Model UN conferences attended before this one.</span>
                    </div>

                    <div className="rf-nav">
                      <div />
                      <button className="rf-btn-proceed" onClick={next}>Proceed →</button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step1"
                    custom={dir} variants={SLIDE}
                    initial="initial" animate="animate" exit="exit"
                    transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
                  >
                    <span className="rf-step-classification">Restricted · Delegation Assignment</span>
                    <span className="rf-step-meta">Page 02 / 03 · Delegation Preferences</span>
                    <h2 className="rf-step-title">Your<br />delegation.</h2>
                    <p className="rf-step-sub">Where you wish to serve. Preferences are considered, not guaranteed.</p>

                    <span className="rf-sub-label">Committee Preferences</span>
                    {[1,2,3].map(n => (
                      <div className="rf-field" key={`cp${n}`}>
                        <label className="rf-label">Committee Preference {n}</label>
                        <select className="rf-select"
                          value={form[`committee_pref_${n}`]}
                          onChange={e => set(`committee_pref_${n}`, e.target.value)}
                        >
                          <option value="">— Select committee</option>
                          {COMMITTEES.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                        {n === 1 && errors.committee_pref_1 && <span className="rf-error">{errors.committee_pref_1}</span>}
                      </div>
                    ))}

                    <hr className="rf-divider" />
                    <span className="rf-sub-label">Portfolio Preferences</span>
                    {[1,2,3].map(n => (
                      <div className="rf-field" key={`pp${n}`}>
                        <label className="rf-label">Portfolio Preference {n}</label>
                        <input className="rf-input" type="text"
                          value={form[`portfolio_pref_${n}`]}
                          onChange={e => set(`portfolio_pref_${n}`, e.target.value)}
                          placeholder="e.g. United States, Narendra Modi"
                        />
                      </div>
                    ))}
                    <p className="rf-hint">Reference the Portfolio Matrix for available options.</p>

                    <div className="rf-nav">
                      <button className="rf-btn-back" onClick={back}>← Previous</button>
                      <button className="rf-btn-proceed" onClick={next}>Proceed →</button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2"
                    custom={dir} variants={SLIDE}
                    initial="initial" animate="animate" exit="exit"
                    transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
                  >
                    <span className="rf-step-classification">Restricted · Documentation & Payment</span>
                    <span className="rf-step-meta">Page 03 / 03 · Documentation</span>
                    <h2 className="rf-step-title">Secure your<br />place.</h2>
                    <p className="rf-step-sub">Payment confirms your intent. Your seat is not held until this step is complete.</p>

                    <div className="rf-payment-section">
                      <span className="rf-sub-label">Payment — Scan or transfer</span>
                      <div className="rf-qr-wrap">
                        <div className="rf-qr-box">
                          <QRCode
                            value="upi://pay?pa=9811588040@ptyes&pn=Joginder%20Jhamb&cu=INR"
                            size={130}
                            fgColor="#9b6e09"
                            bgColor="transparent"
                            style={{ display: 'block' }}
                          />
                        </div>
                        <div className="rf-bank-details">
                          {Object.entries({ Amount: BANK.amount, Name: BANK.name, 'Account No': BANK.account, IFSC: BANK.ifsc, UPI: BANK.upi }).map(([k, v]) => (
                            <div className="rf-bank-row" key={k} style={k === 'Amount' ? { borderBottom: '1px solid rgba(155,110,9,0.18)', paddingBottom: 12, marginBottom: 4 } : {}}>
                              <span className="rf-bank-key" style={k === 'Amount' ? { color: 'var(--gold)', opacity: 0.7 } : {}}>{k}</span>
                              <span className="rf-bank-val" style={k === 'Amount' ? { color: 'var(--gold)', fontSize: 18, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", opacity: 1 } : {}}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rf-field">
                      <label className="rf-label">Payment Screenshot</label>
                      <div className={`rf-upload-area${form.payment_screenshot ? ' uploaded' : ''}`}>
                        <input type="file" className="rf-upload-input"
                          accept="image/*,application/pdf"
                          onChange={e => set('payment_screenshot', e.target.files[0])}
                        />
                        <span className="rf-upload-icon">↑</span>
                        <span className="rf-upload-label">
                          {form.payment_screenshot ? 'File attached' : 'Attach payment screenshot'}
                        </span>
                        {form.payment_screenshot
                          ? <span className="rf-upload-name">{form.payment_screenshot.name}</span>
                          : <span className="rf-upload-hint">JPG, PNG or PDF · max 10 MB</span>
                        }
                      </div>
                      {errors.payment_screenshot && <span className="rf-error">{errors.payment_screenshot}</span>}
                    </div>

                    <div className="rf-field">
                      <label className="rf-label">School ID Card</label>
                      <div className={`rf-upload-area${form.id_card ? ' uploaded' : ''}`}>
                        <input type="file" className="rf-upload-input"
                          accept="image/*,application/pdf"
                          onChange={e => set('id_card', e.target.files[0])}
                        />
                        <span className="rf-upload-icon">↑</span>
                        <span className="rf-upload-label">
                          {form.id_card ? 'File attached' : 'Attach school ID card'}
                        </span>
                        {form.id_card
                          ? <span className="rf-upload-name">{form.id_card.name}</span>
                          : <span className="rf-upload-hint">JPG, PNG or PDF · max 10 MB</span>
                        }
                      </div>
                      {errors.id_card && <span className="rf-error">{errors.id_card}</span>}
                    </div>

                    {errors.submit && <p className="rf-error" style={{ fontSize: 12, marginTop: 8 }}>{errors.submit}</p>}

                    <div className="rf-tos-wrap">
                      <div className="rf-tos-row" onClick={() => setAgreedToTerms(v => !v)}>
                        <input type="checkbox" className="rf-tos-hidden" checked={agreedToTerms} onChange={() => {}} />
                        <span className={`rf-tos-box${agreedToTerms ? ' checked' : ''}`} />
                        <span className="rf-tos-text">
                          By submitting, I agree to the{' '}
                          <a href="#" onClick={e => e.stopPropagation()}>Terms &amp; Conditions</a>
                          {' '}of Mosaic MUN II and confirm all details are accurate
                        </span>
                      </div>
                    </div>

                    <div className="rf-nav">
                      <button className="rf-btn-back" onClick={back}>← Previous</button>
                      <button className="rf-btn-proceed" onClick={submit} disabled={submitting || !agreedToTerms}>
                        {submitting ? 'Processing...' : 'Submit Dossier →'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Photo stage */}
          <PhotoStage step={step} fieldFocused={fieldFocused} />
        </div>
      ) : (
        /* ── Credential ceremony ── */
        <motion.div
          className="rf-credential-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}
        >
          <CeremonyLayer />

          <div className="rf-credential-inner">
            <motion.p
              className="rf-credential-eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Registration Complete · Pending Allocation
            </motion.p>
            <motion.h2
              className="rf-credential-title"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: [0.22,1,0.36,1] }}
            >
              Your credential<br />has been issued.
            </motion.h2>

            <motion.div
              className="rf-pass"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.22,1,0.36,1] }}
            >
              <div className="rf-pass-top">
                <span className="rf-pass-logo-line">Mosaic MUN II · Delegate Credential</span>
                <span className="rf-pass-conf">ACCREDITATION</span>
              </div>
              <div className="rf-pass-body">
                <div className="rf-pass-info">
                  <div className="rf-pass-field">
                    <span className="rf-pass-field-key">Delegate</span>
                    <span className="rf-pass-field-val">{registration?.full_name}</span>
                  </div>
                  <div className="rf-pass-field">
                    <span className="rf-pass-field-key">Registration ID</span>
                    <span className="rf-pass-field-val mono">{registration?.registration_id}</span>
                  </div>
                  <div className="rf-pass-field">
                    <span className="rf-pass-field-key">Institution</span>
                    <span className="rf-pass-field-val" style={{ fontSize: 13 }}>Saraswati Global School</span>
                  </div>
                  <div className="rf-pass-field">
                    <span className="rf-pass-field-key">Committee</span>
                    <span className="rf-pass-field-val" style={{ fontSize: 12, opacity: 0.5 }}>Pending allocation</span>
                  </div>
                  <div className="rf-pass-field">
                    <span className="rf-pass-field-key">Status</span>
                    <span className="rf-pass-field-val status">PENDING ALLOCATION</span>
                  </div>
                </div>
                <div className="rf-pass-qr">
                  <QRCode
                    value={`https://mosaicmodelunitednatons.vercel.app/verify/${registration?.registration_id || ''}`}
                    size={100}
                    fgColor="#9b6e09"
                    bgColor="transparent"
                  />
                </div>
              </div>
              <div className="rf-pass-footer">
                <span className="rf-pass-date">
                  {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                </span>
                <span className="rf-pass-type-badge">SGS Delegate</span>
              </div>
            </motion.div>

            <p className="rf-credential-note">
              Screenshot or save your credential. You will be notified via the registered email address once your portfolio is confirmed.
            </p>

            {/* Dashboard CTA */}
            <motion.div
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.8, delay:1.1, ease:[0.22,1,0.36,1] }}
              style={{ width:'100%', maxWidth:520, marginTop:24, border:'1px solid rgba(155,110,9,0.25)', background:'rgba(155,110,9,0.04)', padding:'24px 24px' }}
            >
              <div style={{ fontSize:'7px', letterSpacing:'0.44em', textTransform:'uppercase', color:'rgba(155,110,9,0.5)', marginBottom:10 }}>DELEGATE PORTAL</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:900, fontSize:'1.2rem', letterSpacing:'-0.03em', color:'#e8e4dc', marginBottom:10 }}>
                Track your allotment.<br/>Talk to Mozart.
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:13, color:'#b5a88e', lineHeight:1.65, marginBottom:20 }}>
                Create your delegate account to access your dashboard — view your allotment status, get a committee brief from Mozart, and raise queries to the Secretariat.
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <Link
                  to={`/create-account?email=${encodeURIComponent(registration?.email || '')}&reg=${encodeURIComponent(registration?.registration_id || '')}`}
                  style={{ background:'var(--gold)', color:'#000', padding:'13px 24px', fontSize:'8px', letterSpacing:'0.3em', textTransform:'uppercase', fontFamily:"'Poppins',sans-serif", fontWeight:500, textDecoration:'none', display:'inline-block' }}
                >
                  Create Account →
                </Link>
                <Link to="/" style={{ border:'1px solid rgba(155,110,9,0.22)', color:'var(--gold)', opacity:0.55, padding:'13px 20px', fontSize:'8px', letterSpacing:'0.3em', textTransform:'uppercase', fontFamily:"'Poppins',sans-serif", textDecoration:'none', display:'inline-block' }}>
                  Skip for now
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      <footer className="rf-page-footer" aria-label="Page footer">
        <div className="rf-page-footer-left">
          <img src="/brand-assets/mosaic-logo-nobg.png" className="rf-page-footer-logo" alt="Mosaic MUN" />
          <div className="rf-page-footer-info">
            <span className="rf-page-footer-name">Mosaic MUN II</span>
            <span className="rf-page-footer-meta">11 · 12 July 2026 · Saraswati Global School, Faridabad</span>
          </div>
        </div>
        <div className="rf-page-footer-right">
          <a href="/" className="rf-page-footer-link">Home</a>
          <span className="rf-page-footer-sep">·</span>
          <a href="/register" className="rf-page-footer-link">Register</a>
          <span className="rf-page-footer-sep">·</span>
          <a href="https://instagram.com/mosaicmunofficial" target="_blank" rel="noopener noreferrer" className="rf-page-footer-link" style={{ color:'var(--gold)', opacity:0.45 }}>Instagram ↗</a>
        </div>
      </footer>
    </div>
  )
}
