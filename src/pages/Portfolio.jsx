import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────
// COMMITTEE METADATA
// ─────────────────────────────────────────────
const COMMITTEES = [
  {
    id: 'UNGA', file: '001', prefix: 'G',
    name: 'United Nations General Assembly',
    hook: 'Who speaks when the state cannot?',
    type: 'UN Body', count: 92,
    photo: '/brand-assets/0A6F8213-9ACE-43D9-B87F-24EAF110D480_1_105_c.jpeg',
  },
  {
    id: 'UNCSW', file: '002', prefix: 'C',
    name: 'UN Commission on the Status of Women',
    hook: 'Whose body counts as labour?',
    type: 'UN Body', count: 92,
    photo: '/brand-assets/2E9FC29D-C33E-4880-B233-097764A88E0B_4_5005_c.jpeg',
  },
  {
    id: 'UNHRC', file: '003', prefix: 'H',
    name: 'UN Human Rights Council',
    hook: 'Can a perpetrator erase what history demands to remember?',
    type: 'UN Body', count: 92,
    photo: '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  },
  {
    id: 'AIPPM', file: '004', prefix: 'A',
    name: 'All India Political Parties Meet',
    hook: 'The strike landed. Parliament was not consulted.',
    type: 'Indian Parliament', count: 80,
    photo: '/brand-assets/4AA719A1-A4D2-4877-916F-9322FE10EBD6_4_5005_c.jpeg',
  },
  {
    id: 'IPL', file: '005', prefix: 'L',
    name: 'Indian Premier League',
    hook: 'Build the franchise. Win the auction.',
    type: 'Custom', count: 20,
    photo: '/brand-assets/8AF34B6E-9909-47EA-ABE8-7E55CB30BF98_1_105_c.jpeg',
  },
  {
    id: 'IP', file: '006', prefix: 'P',
    name: 'International Press',
    hook: 'The record belongs to the press.',
    type: 'Press Corps', count: null,
    photo: '/brand-assets/0A6F8213-9ACE-43D9-B87F-24EAF110D480_1_105_c.jpeg',
  },
  {
    id: 'USSIC', file: '007', prefix: 'S',
    name: 'US Senate Intelligence Committee',
    hook: 'The files were sealed. Now they are not.',
    type: 'Crisis', count: 35,
    photo: '/brand-assets/3CDB3AAF-0A44-430B-AFF3-41D7B339FB26_1_105_c.jpeg',
  },
]

// ─────────────────────────────────────────────
// STATIC PORTFOLIO DATA (mirrors Supabase seed)
// ─────────────────────────────────────────────
const UN_COUNTRIES = [
  'United States','United Kingdom','France','Russia','China','India','Germany','Japan',
  'Brazil','South Africa','Canada','Australia','Italy','Spain','Netherlands','Belgium',
  'Switzerland','Sweden','Norway','Denmark','Finland','Austria','Ireland','Portugal',
  'Poland','Ukraine','Czech Republic','Romania','Hungary','Serbia','Bulgaria','Greece',
  'Türkiye','Saudi Arabia','UAE','Qatar','Israel','Iran','Iraq','Syria','Jordan',
  'Lebanon','Egypt','Morocco','Algeria','Tunisia','Libya','Sudan','Ethiopia','Kenya',
  'Tanzania','Uganda','Rwanda','Nigeria','Ghana','Senegal','Angola','Zambia','Botswana',
  'Namibia','South Sudan','Pakistan','Bangladesh','Sri Lanka','Nepal','Bhutan',
  'Afghanistan','Indonesia','Malaysia','Singapore','Thailand','Vietnam','Philippines',
  'South Korea','North Korea','Mongolia','Kazakhstan','Uzbekistan','Mexico','Argentina',
  'Chile','Colombia','Peru','Venezuela','Ecuador','Uruguay','Paraguay','Cuba',
  'Dominican Republic','Jamaica','New Zealand','Belarus',
]

const AIPPM_DELEGATES = [
  { name:'Narendra Modi', group:'Union Government' },{ name:'Amit Shah', group:'Union Government' },
  { name:'Rajnath Singh', group:'Union Government' },{ name:'S. Jaishankar', group:'Union Government' },
  { name:'Nirmala Sitharaman', group:'Union Government' },{ name:'J. P. Nadda', group:'Union Government' },
  { name:'Ashwini Vaishnaw', group:'Union Government' },{ name:'Piyush Goyal', group:'Union Government' },
  { name:'Shivraj Singh Chouhan', group:'Union Government' },{ name:'Dharmendra Pradhan', group:'Union Government' },
  { name:'Kiren Rijiju', group:'Union Government' },{ name:'Gajendra Singh Shekhawat', group:'Union Government' },
  { name:'Hardeep Singh Puri', group:'Union Government' },{ name:'Bhupender Yadav', group:'Union Government' },
  { name:'Anurag Thakur', group:'Union Government' },
  { name:'Tejasvi Surya', group:'BJP Leadership' },{ name:'Nishikant Dubey', group:'BJP Leadership' },
  { name:'Ravi Shankar Prasad', group:'BJP Leadership' },{ name:'Bansuri Swaraj', group:'BJP Leadership' },
  { name:'Manoj Tiwari', group:'BJP Leadership' },{ name:'Kangana Ranaut', group:'BJP Leadership' },
  { name:'Dinesh Sharma', group:'BJP Leadership' },{ name:'Sudhanshu Trivedi', group:'BJP Leadership' },
  { name:'Sambit Patra', group:'BJP Leadership' },{ name:'K. Annamalai', group:'BJP Leadership' },
  { name:'Devendra Fadnavis', group:'BJP Leadership' },{ name:'Yogi Adityanath', group:'BJP Leadership' },
  { name:'Himanta Biswa Sarma', group:'BJP Leadership' },{ name:'Mohan Yadav', group:'BJP Leadership' },
  { name:'Bhajan Lal Sharma', group:'BJP Leadership' },
  { name:'Rahul Gandhi', group:'Indian National Congress' },{ name:'Mallikarjun Kharge', group:'Indian National Congress' },
  { name:'Priyanka Gandhi Vadra', group:'Indian National Congress' },{ name:'Shashi Tharoor', group:'Indian National Congress' },
  { name:'Sachin Pilot', group:'Indian National Congress' },{ name:'Bhupesh Baghel', group:'Indian National Congress' },
  { name:'Revanth Reddy', group:'Indian National Congress' },{ name:'Siddaramaiah', group:'Indian National Congress' },
  { name:'K. C. Venugopal', group:'Indian National Congress' },{ name:'Jairam Ramesh', group:'Indian National Congress' },
  { name:'Pawan Khera', group:'Indian National Congress' },{ name:'Gaurav Gogoi', group:'Indian National Congress' },
  { name:'Arvind Kejriwal', group:'Regional Opposition' },{ name:'Atishi', group:'Regional Opposition' },
  { name:'Sanjay Singh', group:'Regional Opposition' },{ name:'Akhilesh Yadav', group:'Regional Opposition' },
  { name:'Dimple Yadav', group:'Regional Opposition' },{ name:'Tejashwi Yadav', group:'Regional Opposition' },
  { name:'Mamata Banerjee', group:'Regional Opposition' },{ name:'Abhishek Banerjee', group:'Regional Opposition' },
  { name:"Derek O'Brien", group:'Regional Opposition' },{ name:'M. K. Stalin', group:'Regional Opposition' },
  { name:'Kanimozhi', group:'Regional Opposition' },{ name:'Uddhav Thackeray', group:'Regional Opposition' },
  { name:'Aaditya Thackeray', group:'Regional Opposition' },{ name:'Sharad Pawar', group:'Regional Opposition' },
  { name:'Supriya Sule', group:'Regional Opposition' },{ name:'Omar Abdullah', group:'Regional Opposition' },
  { name:'Mehbooba Mufti', group:'Regional Opposition' },{ name:'Hemant Soren', group:'Regional Opposition' },
  { name:'Bhagwant Mann', group:'Regional Opposition' },{ name:'Chandrababu Naidu', group:'Regional Opposition' },
  { name:'Naveen Patnaik', group:'Regional Leaders' },{ name:'K. Kavitha', group:'Regional Leaders' },
  { name:'K. T. Rama Rao', group:'Regional Leaders' },{ name:'Pinarayi Vijayan', group:'Regional Leaders' },
  { name:'O. Panneerselvam', group:'Regional Leaders' },{ name:'Edappadi K. Palaniswami', group:'Regional Leaders' },
  { name:'H. D. Kumaraswamy', group:'Regional Leaders' },{ name:'D. K. Shivakumar', group:'Regional Leaders' },
  { name:'Eknath Shinde', group:'Regional Leaders' },{ name:'Ajit Pawar', group:'Regional Leaders' },
  { name:'Chirag Paswan', group:'Regional Leaders' },{ name:'Jitan Ram Manjhi', group:'Regional Leaders' },
  { name:'Asaduddin Owaisi', group:'Regional Leaders' },{ name:'Prakash Ambedkar', group:'Regional Leaders' },
  { name:'Jayant Chaudhary', group:'Regional Leaders' },{ name:'Hanuman Beniwal', group:'Regional Leaders' },
  { name:'Conrad Sangma', group:'Regional Leaders' },{ name:'N. Biren Singh', group:'Regional Leaders' },
]

const IPL_FRANCHISES = [
  { name:'Mumbai Indians', group:'Existing Franchises' },{ name:'Chennai Super Kings', group:'Existing Franchises' },
  { name:'Royal Challengers Bengaluru', group:'Existing Franchises' },{ name:'Kolkata Knight Riders', group:'Existing Franchises' },
  { name:'Sunrisers Hyderabad', group:'Existing Franchises' },{ name:'Rajasthan Royals', group:'Existing Franchises' },
  { name:'Delhi Capitals', group:'Existing Franchises' },{ name:'Punjab Kings', group:'Existing Franchises' },
  { name:'Gujarat Titans', group:'Existing Franchises' },{ name:'Lucknow Super Giants', group:'Existing Franchises' },
  { name:'Deccan Chargers', group:'Legacy Franchises' },{ name:'Kochi Tuskers Kerala', group:'Legacy Franchises' },
  { name:'Pune Warriors India', group:'Legacy Franchises' },{ name:'Rising Pune Supergiant', group:'Legacy Franchises' },
  { name:'Kashmir Kings', group:'Expansion Franchises' },{ name:'Goa Mariners', group:'Expansion Franchises' },
  { name:'Ahmedabad Falcons', group:'Expansion Franchises' },{ name:'Vizag Sharks', group:'Expansion Franchises' },
  { name:'Indore Leopards', group:'Expansion Franchises' },{ name:'Nagpur Strikers', group:'Expansion Franchises' },
]

const IP_TRACKS = [
  { name:'Photojournalism', group:'Press Tracks' },
  { name:'Editorial Caricature', group:'Press Tracks' },
  { name:'Written Journalism', group:'Press Tracks' },
]

const USSIC_ROLES = [
  { name:'Marco Rubio', group:'Senate' },{ name:'Mark Warner', group:'Senate' },
  { name:'Tom Cotton', group:'Senate' },{ name:'Ron Wyden', group:'Senate' },
  { name:'Michael Bennet', group:'Senate' },{ name:'Susan Collins', group:'Senate' },
  { name:'James Lankford', group:'Senate' },{ name:'Kirsten Gillibrand', group:'Senate' },
  { name:'John Cornyn', group:'Senate' },{ name:'Angus King', group:'Senate' },
  { name:'Jerry Moran', group:'Senate' },{ name:'Martin Heinrich', group:'Senate' },
  { name:'Ted Cruz', group:'Senate' },{ name:'Chris Coons', group:'Senate' },
  { name:'Josh Hawley', group:'Senate' },
  { name:'Director of National Intelligence', group:'Intelligence Community' },
  { name:'CIA Director', group:'Intelligence Community' },{ name:'FBI Director', group:'Intelligence Community' },
  { name:'NSA Director', group:'Intelligence Community' },{ name:'DIA Director', group:'Intelligence Community' },
  { name:'Director, National Counterterrorism Center', group:'Intelligence Community' },
  { name:'CIA Deputy Director for Operations', group:'Intelligence Community' },
  { name:'Director, CISA', group:'Intelligence Community' },
  { name:'President of the United States', group:'Executive Branch' },
  { name:'Vice President', group:'Executive Branch' },{ name:'Secretary of State', group:'Executive Branch' },
  { name:'Secretary of Defense', group:'Executive Branch' },{ name:'Attorney General', group:'Executive Branch' },
  { name:'Chairman, Joint Chiefs of Staff', group:'Military Leadership' },
  { name:'Commander, US Cyber Command', group:'Military Leadership' },
  { name:'Commander, Indo-Pacific Command', group:'Military Leadership' },
  { name:'CEO, Google', group:'Tech & Industry' },{ name:'CEO, Microsoft', group:'Tech & Industry' },
  { name:'Whistleblower Asset Alpha', group:'Wildcard' },
  { name:'Foreign Intelligence Liaison Director', group:'Wildcard' },
]

function getPortfolioList(id) {
  switch (id) {
    case 'UNGA': return UN_COUNTRIES.map((name, i) => ({ name, group: null }))
    case 'UNCSW': return UN_COUNTRIES.map((name, i) => ({ name, group: null }))
    case 'UNHRC': return UN_COUNTRIES.map((name, i) => ({ name, group: null }))
    case 'AIPPM': return AIPPM_DELEGATES
    case 'IPL':   return IPL_FRANCHISES
    case 'IP':    return IP_TRACKS
    case 'USSIC': return USSIC_ROLES
    default:      return []
  }
}

function getArchiveCode(committee, index) {
  const prefixMap = { UNGA:'G',UNCSW:'C',UNHRC:'H',AIPPM:'A',IPL:'L',IP:'P',USSIC:'S' }
  return `${prefixMap[committee]}-${String(index + 1).padStart(3,'0')}`
}

const STATUS_LABELS = {
  vacant:           '— VACANT —',
  reserved:         'RESERVED',
  allotted:         'ALLOTTED',
  'allotted-unpaid':'ALLOTTED · UNPAID',
  waitlisted:       'WAITLISTED',
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const css = `
/* ── Portfolio Matrix Page ── */
.pm-page {
  min-height: 100vh;
  background: #000;
  position: relative;
  font-family: 'Poppins', sans-serif;
  overflow-x: hidden;
}

/* Scan line — runs once on entry */
@keyframes pm-scan {
  0%   { top: 0; opacity: 0.7; }
  90%  { opacity: 0.4; }
  100% { top: 100vh; opacity: 0; }
}
.pm-scan {
  position: fixed;
  left: 0; right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent 0%, rgba(155,110,9,0.9) 20%, rgba(155,110,9,0.9) 80%, transparent 100%);
  z-index: 900;
  animation: pm-scan 1.8s cubic-bezier(0.4, 0, 0.6, 1) forwards;
  pointer-events: none;
}

/* ── Back nav ── */
.pm-back {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 400;
  padding: 18px 8vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(155,110,9,0.07);
  background: rgba(0,0,0,0.9);
  backdrop-filter: blur(10px);
}

.pm-back-link {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 8px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.5;
  text-decoration: none;
  transition: opacity 0.2s;
}
.pm-back-link:hover { opacity: 0.9; }

.pm-back-line {
  width: 20px;
  height: 1px;
  background: currentColor;
  position: relative;
}
.pm-back-line::before {
  content: '';
  position: absolute;
  left: 0; top: -3px;
  width: 6px; height: 6px;
  border-left: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
}

.pm-back-label {
  font-size: 8px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.4;
}

/* ── Page header ── */
.pm-header {
  padding: 120px 8vw 60px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(155,110,9,0.08);
}

.pm-header-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 75% 50%, rgba(155,110,9,0.04) 0%, transparent 65%),
    linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}

.pm-eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.pm-eyebrow-line {
  width: 30px; height: 1px;
  background: var(--gold); opacity: 0.35;
}
.pm-eyebrow-text {
  font-size: 7.5px;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.55;
}

.pm-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(3.5rem, 10vw, 10rem);
  line-height: 0.86;
  letter-spacing: -0.05em;
  color: var(--cream);
  margin: 0 0 24px;
}

.pm-header-meta {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.pm-meta-item {
  font-size: 8.5px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.45;
}

.pm-meta-sep {
  width: 1px; height: 14px;
  background: rgba(155,110,9,0.2);
}

/* ── Committee tabs ── */
.pm-tabs-wrap {
  position: sticky;
  top: 57px;
  z-index: 300;
  background: rgba(0,0,0,0.97);
  border-bottom: 1px solid rgba(155,110,9,0.08);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.pm-tabs-wrap::-webkit-scrollbar { display: none; }

.pm-tabs {
  display: flex;
  padding: 0 8vw;
  min-width: max-content;
}

.pm-tab {
  padding: 18px 20px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: border-color 0.25s ease, opacity 0.25s ease;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.pm-tab-file {
  display: block;
  font-size: 6.5px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.35;
  margin-bottom: 4px;
  transition: opacity 0.25s;
}

.pm-tab-id {
  display: block;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cream);
  opacity: 0.45;
  transition: opacity 0.25s;
}

.pm-tab:hover .pm-tab-file,
.pm-tab:hover .pm-tab-id { opacity: 0.75; }

.pm-tab.active {
  border-bottom-color: var(--gold);
}
.pm-tab.active .pm-tab-file { opacity: 0.7; }
.pm-tab.active .pm-tab-id { opacity: 1; color: var(--cream); }

/* ── Committee header ── */
.pm-committee-hdr {
  position: relative;
  padding: 48px 8vw 40px;
  border-bottom: 1px solid rgba(155,110,9,0.07);
  overflow: hidden;
}

.pm-hdr-photo {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center 35%;
  filter: sepia(0.6) saturate(0.4) brightness(0.14);
  pointer-events: none;
}

.pm-hdr-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0,0,0,0.92) 45%, rgba(0,0,0,0.6) 100%),
    linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%);
  pointer-events: none;
}

.pm-hdr-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0 48px;
  align-items: start;
}

.pm-hdr-file-col {
  padding-top: 6px;
}

.pm-hdr-file-num {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1;
  color: var(--gold);
  opacity: 0.22;
  letter-spacing: -0.04em;
}

.pm-hdr-file-label {
  font-size: 7px;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.4;
  margin-top: 4px;
}

.pm-hdr-type {
  font-size: 7.5px;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.5;
  margin-bottom: 12px;
}

.pm-hdr-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(1.2rem, 2.8vw, 2.2rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--cream);
  margin: 0 0 10px;
}

.pm-hdr-hook {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(0.9rem, 1.5vw, 1.15rem);
  color: var(--muted);
  opacity: 0.65;
  margin: 0 0 20px;
}

.pm-hdr-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.pm-hdr-stat {
  font-size: 8px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.4;
}

.pm-hdr-stat strong {
  color: var(--gold);
  opacity: 0.7;
  font-weight: 500;
}

/* ── Legend ── */
.pm-legend {
  padding: 16px 8vw;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(155,110,9,0.05);
}

.pm-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 7px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.4;
}

.pm-legend-dot {
  width: 6px; height: 6px;
  border: 1px solid currentColor;
  flex-shrink: 0;
}
.pm-legend-dot.vacant    { color: rgba(155,110,9,0.5); }
.pm-legend-dot.reserved  { color: rgba(180,130,40,0.6); background: rgba(155,110,9,0.08); }
.pm-legend-dot.allotted  { color: rgba(150,50,50,0.5); background: rgba(150,50,50,0.08); }
.pm-legend-dot.unpaid    { color: rgba(200,140,30,0.55); }
.pm-legend-dot.waitlisted{ color: rgba(100,100,100,0.35); }

/* ── Grid ── */
.pm-grid-wrap {
  padding: 40px 8vw 80px;
}

.pm-group-label {
  grid-column: 1 / -1;
  font-size: 7.5px;
  letter-spacing: 0.46em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.4;
  padding: 28px 0 12px;
  border-bottom: 1px solid rgba(155,110,9,0.06);
  margin-bottom: 4px;
}

.pm-group-label:first-child { padding-top: 0; }

.pm-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(155,110,9,0.06);
}

/* ── Portfolio cards ── */
@keyframes pm-vacant-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%       { box-shadow: inset 0 0 12px 0 rgba(155,110,9,0.04); }
}

@keyframes pm-amber-blink {
  0%, 100% { opacity: 0.8; }
  50%       { opacity: 0.2; }
}

.pm-card {
  position: relative;
  background: #000;
  padding: 16px 14px 14px;
  min-height: 86px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: default;
  transition: background 0.25s ease;
  overflow: hidden;
}

.pm-card:hover { background: rgba(155,110,9,0.018); }

.pm-card-code {
  font-size: 7px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.3;
  display: block;
  margin-bottom: 8px;
  transition: opacity 0.2s;
}

.pm-card:hover .pm-card-code { opacity: 0.55; }

.pm-card-name {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--cream);
  opacity: 0.75;
  line-height: 1.35;
  flex: 1;
  transition: opacity 0.2s;
}

.pm-card:hover .pm-card-name { opacity: 0.95; }

.pm-card-status {
  display: block;
  font-size: 6.5px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  margin-top: 10px;
}

/* VACANT */
.pm-card[data-status="vacant"] {
  animation: pm-vacant-pulse 4s ease-in-out infinite;
}
.pm-card[data-status="vacant"] .pm-card-status {
  color: var(--gold);
  opacity: 0.35;
}

/* RESERVED */
.pm-card[data-status="reserved"] {
  background: linear-gradient(140deg, #000 55%, rgba(155,110,9,0.04) 100%);
}
.pm-card[data-status="reserved"]::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: rgba(155,110,9,0.4);
}
.pm-card[data-status="reserved"] .pm-card-status {
  color: rgba(190,140,50,0.75);
  opacity: 1;
}

/* ALLOTTED */
.pm-card[data-status="allotted"] { opacity: 0.5; }
.pm-card[data-status="allotted"] .pm-card-name { opacity: 0.45; }
.pm-card[data-status="allotted"]::after {
  content: 'ALLOTTED';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-16deg);
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: rgba(160,50,50,0.6);
  border: 1px solid rgba(160,50,50,0.4);
  padding: 3px 8px;
  white-space: nowrap;
  pointer-events: none;
}
.pm-card[data-status="allotted"] .pm-card-status { display: none; }

/* ALLOTTED · UNPAID */
.pm-card[data-status="allotted-unpaid"] { opacity: 0.6; }
.pm-card[data-status="allotted-unpaid"] .pm-card-name { opacity: 0.5; }
.pm-card[data-status="allotted-unpaid"]::after {
  content: 'UNPAID';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-16deg);
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: rgba(200,140,30,0.65);
  border: 1px solid rgba(200,140,30,0.4);
  padding: 3px 8px;
  white-space: nowrap;
  pointer-events: none;
}
.pm-card[data-status="allotted-unpaid"] .pm-card-code::after {
  content: ' ●';
  color: rgba(200,140,30,0.8);
  animation: pm-amber-blink 1.6s ease-in-out infinite;
}
.pm-card[data-status="allotted-unpaid"] .pm-card-status { display: none; }

/* WAITLISTED */
.pm-card[data-status="waitlisted"] { opacity: 0.35; }
.pm-card[data-status="waitlisted"] .pm-card-status {
  color: var(--muted);
  opacity: 0.5;
}

/* IP unlimited cards */
.pm-card.pm-unlimited {
  min-height: 110px;
  border: 1px solid rgba(155,110,9,0.12);
  background: rgba(155,110,9,0.012);
}
.pm-card.pm-unlimited .pm-card-name {
  font-size: 13px;
  opacity: 0.85;
}
.pm-unlimited-tag {
  font-size: 7px;
  letter-spacing: 0.36em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.5;
  margin-top: 10px;
  display: block;
}

/* ── IP special layout (3 wide cards) ── */
.pm-grid.pm-grid-ip {
  grid-template-columns: repeat(3, 1fr);
}

/* ── Mobile ── */
@media (max-width: 900px) {
  .pm-back { padding: 14px 20px; }
  .pm-header { padding: 100px 20px 44px; }
  .pm-tabs { padding: 0 20px; }
  .pm-committee-hdr { padding: 32px 20px 28px; }
  .pm-hdr-content { grid-template-columns: 64px 1fr; gap: 0 24px; }
  .pm-hdr-name { font-size: clamp(1.1rem, 5.5vw, 1.6rem); }
  .pm-legend { padding: 14px 20px; gap: 16px; }
  .pm-grid-wrap { padding: 28px 20px 60px; }
  .pm-grid { grid-template-columns: repeat(2, 1fr); }
  .pm-grid.pm-grid-ip { grid-template-columns: 1fr; }
  .pm-card { min-height: 80px; padding: 14px 12px 12px; }
  .pm-card-name { font-size: 11px; }
}
`

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────
function PortfolioCard({ code, name, status, unlimited = false, delay = 0 }) {
  return (
    <motion.div
      className={`pm-card${unlimited ? ' pm-unlimited' : ''}`}
      data-status={unlimited ? undefined : status}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
    >
      <span className="pm-card-code">{code}</span>
      <span className="pm-card-name">{name}</span>
      {unlimited
        ? <span className="pm-unlimited-tag">Open · Unlimited Seats</span>
        : <span className="pm-card-status">{STATUS_LABELS[status] || STATUS_LABELS.vacant}</span>
      }
    </motion.div>
  )
}

function CommitteeContent({ committee, statusMap }) {
  const items = getPortfolioList(committee.id)
  const isIP = committee.id === 'IP'

  const vacantCount = isIP
    ? null
    : items.filter(item => (statusMap[`${committee.id}-${item.name}`] || 'vacant') === 'vacant').length

  const hasGroups = items.some(item => item.group)

  const renderGrid = () => {
    if (!hasGroups) {
      return (
        <div className={`pm-grid${isIP ? ' pm-grid-ip' : ''}`}>
          {items.map((item, i) => (
            <PortfolioCard
              key={item.name}
              code={getArchiveCode(committee.id, i)}
              name={item.name}
              status={statusMap[`${committee.id}-${item.name}`] || 'vacant'}
              unlimited={isIP}
              delay={Math.min(i * 0.012, 0.4)}
            />
          ))}
        </div>
      )
    }

    const groups = []
    let currentGroup = null
    items.forEach((item, i) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group
        groups.push({ label: item.group, items: [] })
      }
      groups[groups.length - 1].items.push({ ...item, index: i })
    })

    return groups.map(group => (
      <div key={group.label}>
        <div className="pm-group-label">{group.label}</div>
        <div className={`pm-grid${isIP ? ' pm-grid-ip' : ''}`}>
          {group.items.map(item => (
            <PortfolioCard
              key={item.name}
              code={getArchiveCode(committee.id, item.index)}
              name={item.name}
              status={statusMap[`${committee.id}-${item.name}`] || 'vacant'}
              unlimited={isIP}
              delay={Math.min(item.index * 0.012, 0.4)}
            />
          ))}
        </div>
      </div>
    ))
  }

  return (
    <motion.div
      key={committee.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Committee header */}
      <div className="pm-committee-hdr">
        <img className="pm-hdr-photo" src={committee.photo} alt="" aria-hidden="true" />
        <div className="pm-hdr-veil" />
        <div className="pm-hdr-content">
          <div className="pm-hdr-file-col">
            <div className="pm-hdr-file-num">{committee.file}</div>
            <div className="pm-hdr-file-label">File No.</div>
          </div>
          <div>
            <div className="pm-hdr-type">{committee.type}</div>
            <h2 className="pm-hdr-name">{committee.name}</h2>
            <p className="pm-hdr-hook">{committee.hook}</p>
            <div className="pm-hdr-stats">
              {committee.count
                ? <span className="pm-hdr-stat"><strong>{committee.count}</strong> Portfolios</span>
                : <span className="pm-hdr-stat"><strong>Unlimited</strong> Seats</span>
              }
              {vacantCount !== null && (
                <>
                  <span style={{ width:1, height:12, background:'rgba(155,110,9,0.18)', display:'inline-block' }} />
                  <span className="pm-hdr-stat"><strong>{vacantCount}</strong> Vacant</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="pm-grid-wrap">
        {renderGrid()}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function Portfolio() {
  const [active, setActive] = useState('UNGA')
  const [statusMap, setStatusMap] = useState({})
  const [scanning, setScanning] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setScanning(false), 2000)
    supabase
      .from('portfolios')
      .select('committee,portfolio,status')
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(({ committee, portfolio, status }) => {
            map[`${committee}-${portfolio}`] = status
          })
          setStatusMap(map)
        }
        setLoaded(true)
      })
    return () => clearTimeout(timer)
  }, [])

  const activeCommittee = COMMITTEES.find(c => c.id === active)
  const totalPortfolios = COMMITTEES.reduce((sum, c) => sum + (c.count || 3), 0)

  return (
    <div className="pm-page">
      {scanning && <div className="pm-scan" aria-hidden="true" />}

      {/* Fixed top bar */}
      <div className="pm-back">
        <Link to="/" className="pm-back-link">
          <span className="pm-back-line" />
          Return to site
        </Link>
        <span className="pm-back-label">Mosaic MUN II · Portfolio Archive</span>
      </div>

      {/* Page header */}
      <div className="pm-header">
        <div className="pm-header-bg" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pm-eyebrow">
            <span className="pm-eyebrow-line" />
            <span className="pm-eyebrow-text">Restricted Access · Mosaic MUN II · July 2026</span>
          </div>
          <h1 className="pm-title">Portfolio<br />Matrix.</h1>
          <div className="pm-header-meta">
            <span className="pm-meta-item">{COMMITTEES.length} Committees</span>
            <span className="pm-meta-sep" />
            <span className="pm-meta-item">{totalPortfolios}+ Portfolios</span>
            <span className="pm-meta-sep" />
            <span className="pm-meta-item">Saraswati Global School</span>
          </div>
        </motion.div>
      </div>

      {/* Committee tabs */}
      <div className="pm-tabs-wrap">
        <div className="pm-tabs" role="tablist">
          {COMMITTEES.map(c => (
            <button
              key={c.id}
              className={`pm-tab${active === c.id ? ' active' : ''}`}
              onClick={() => setActive(c.id)}
              role="tab"
              aria-selected={active === c.id}
            >
              <span className="pm-tab-file">File {c.file}</span>
              <span className="pm-tab-id">{c.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status legend */}
      <div className="pm-legend" aria-hidden="true">
        <span className="pm-legend-item"><span className="pm-legend-dot vacant" />Vacant</span>
        <span className="pm-legend-item"><span className="pm-legend-dot reserved" />Reserved</span>
        <span className="pm-legend-item"><span className="pm-legend-dot allotted" />Allotted</span>
        <span className="pm-legend-item"><span className="pm-legend-dot unpaid" />Allotted · Unpaid</span>
        <span className="pm-legend-item"><span className="pm-legend-dot waitlisted" />Waitlisted</span>
      </div>

      {/* Committee content */}
      <AnimatePresence mode="wait">
        {activeCommittee && (
          <CommitteeContent
            key={active}
            committee={activeCommittee}
            statusMap={statusMap}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
