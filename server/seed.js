const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dns = require("dns");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const localDb = require("./lib/localDb");
const User = require("./models/User");
const Event = require("./models/Event");
const EventParticipation = require("./models/EventParticipation");
const Swipe = require("./models/Swipe");
const Match = require("./models/Match");
const Message = require("./models/Message");

const SEED_EVENTS = [
  {
    _id: "event_sih",
    title: "Smart India Hackathon 2026",
    description: "Nationwide 36-hr innovation sprint on campus, national, and societal problem statements.",
    tagline: "Nationwide 36-hr innovation sprint on campus, national, and societal problem statements.",
    date: "Nov 20 - 22, 2026",
    mode: "offline",
    location: "Main Campus Auditorium & Labs",
    teamSize: 4,
    status: "upcoming",
    type: "hackathon",
    theme: "AI, Web3, Smart Automation & Healthcare",
    color: "from-blue-600 to-indigo-600",
    badge: "Flagship",
    participantsCount: 28,
  },
  {
    _id: "event_makeathon",
    title: "Makeathon 3026 (Campus Flagship)",
    description: "Annual 24-hr hardware & software prototype building competition with top tech sponsors.",
    tagline: "Annual 24-hr hardware & software prototype building competition with top tech sponsors.",
    date: "Dec 05 - 06, 2026",
    mode: "offline",
    location: "Science & Technology Complex",
    teamSize: 4,
    status: "upcoming",
    type: "hackathon",
    theme: "Fullstack, IoT, Robotics & Cloud",
    color: "from-violet-600 to-purple-600",
    badge: "Trending",
    participantsCount: 22,
  },
  {
    _id: "event_devclash",
    title: "DevClash AI Sprint",
    description: "Build next-generation autonomous AI agents, multimodal LLMs, and intelligent web applications.",
    tagline: "Build next-generation autonomous AI agents, multimodal LLMs, and intelligent web applications.",
    date: "Dec 18, 2026",
    mode: "online",
    location: "Virtual (Discord & Campus Sandbox)",
    teamSize: 3,
    status: "upcoming",
    type: "hackathon",
    theme: "Generative AI, LLMs & Autonomous Agents",
    color: "from-rose-600 to-orange-500",
    badge: "AI Track",
    participantsCount: 19,
  },
  {
    _id: "event_cybershield",
    title: "CyberShield Campus Hack",
    description: "Fast-paced security, zero-trust architecture, and secure web application defense hackathon.",
    tagline: "Fast-paced security, zero-trust architecture, and secure web application defense hackathon.",
    date: "Jan 12 - 13, 2027",
    mode: "offline",
    location: "Cybersecurity Center Lab 4",
    teamSize: 3,
    status: "upcoming",
    type: "hackathon",
    theme: "Cybersecurity, Cryptography & DevSecOps",
    color: "from-emerald-600 to-teal-600",
    badge: "Security",
    participantsCount: 15,
  },
];

// 32 Sample Students
const STUDENTS_RAW = [
  {
    _id: "user_001_alice",
    name: "Alice Sharma",
    email: "alice@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Frontend",
    roles: ["Frontend", "UI/UX"],
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Figma", "Redux"],
    bio: "Passionate frontend engineer obsessed with clean UI and smooth animations. Looking for backend & AI teammates to win SIH 2026!",
    links: { github: "https://github.com/alice-sharma", linkedin: "https://linkedin.com/in/alicesharma" },
    cgpa: 9.3,
    isAdmin: false,
    events: ["event_sih", "event_makeathon", "event_devclash"],
    note: "Looking for a rockstar backend engineer and an ML dev to build an automated campus hospital triage tool.",
  },
  {
    _id: "user_002_bob",
    name: "Bob Patel",
    email: "bob@thapar.edu",
    branch: "Information Technology (IT)",
    year: "3rd Year",
    role: "Backend",
    roles: ["Backend", "DevOps"],
    skills: ["Node.js", "Express", "MongoDB", "PostgreSQL", "Docker", "Redis", "REST APIs"],
    bio: "API architect and database optimization geek. Built high-scale backends. Need a solid frontend partner and UI designer!",
    links: { github: "https://github.com/bob-patel", linkedin: "https://linkedin.com/in/bobpatel" },
    cgpa: 8.8,
    isAdmin: false,
    events: ["event_sih", "event_makeathon", "event_devclash"],
    note: "I have the microservices architecture ready. Looking for a frontend specialist to craft a killer demo dashboard.",
  },
  {
    _id: "user_003_charlie",
    name: "Charlie Verma",
    email: "charlie@thapar.edu",
    branch: "Computer Engineering",
    year: "4th Year",
    role: "AI/ML",
    roles: ["AI/ML", "Backend"],
    skills: ["Python", "PyTorch", "FastAPI", "Gemini API", "LangChain", "Vector DBs", "OpenCV"],
    bio: "Focused on agentic workflows and fine-tuning LLMs. Looking for web devs who can wrap intelligent AI models into a slick product.",
    links: { github: "https://github.com/charlie-verma", linkedin: "https://linkedin.com/in/charlieverma" },
    cgpa: 9.5,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Building an agentic code review assistant. Need fullstack web devs to wrap it into a responsive UI.",
  },
  {
    _id: "user_004_divya",
    name: "Divya Nair",
    email: "divya@thapar.edu",
    branch: "Electronics & Communication (ECE)",
    year: "2nd Year",
    role: "UI/UX",
    roles: ["UI/UX", "Frontend"],
    skills: ["Figma", "UI/UX Design", "Wireframing", "Tailwind CSS", "Prototyping", "Design Systems"],
    bio: "Design thinking specialist with 20+ Figma UI kits created. Looking to join a motivated team that values good product experience.",
    links: { github: "https://github.com/divya-nair", linkedin: "https://linkedin.com/in/divyanair" },
    cgpa: 9.1,
    isAdmin: false,
    events: ["event_sih", "event_makeathon"],
    note: "I ensure our team wins the best presentation & usability award. Ready to design high-fidelity clickable mockups in 6 hours.",
  },
  {
    _id: "user_005_rohan",
    name: "Rohan Gupta",
    email: "rohan@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack", "Mobile"],
    skills: ["React", "Node.js", "Socket.io", "MongoDB", "WebSockets", "GraphQL", "Tailwind"],
    bio: "3x hackathon winner. Can turn ideas into working fullstack MVPs in 12 hours flat. Let's team up and take the 1st prize!",
    links: { github: "https://github.com/rohan-gupta", linkedin: "https://linkedin.com/in/rohangupta" },
    cgpa: 8.9,
    isAdmin: false,
    events: ["event_sih", "event_makeathon", "event_devclash"],
    note: "Versatile hacker ready to wire up fullstack features, database pipelines, and WebSocket messaging.",
  },
  {
    _id: "user_006_admin",
    name: "Campus Hackathon Coordinator",
    email: "admin@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "4th Year",
    role: "Fullstack",
    roles: ["Fullstack", "DevOps"],
    skills: ["Node.js", "React", "Cloud Architecture", "Docker", "DevOps"],
    bio: "Official Campus Tech Society Administrator and SIH Organizer. Reach out for hackathon support & rules clarification.",
    links: { github: "https://github.com/campus-admin", linkedin: "https://linkedin.com/in/campusadmin" },
    cgpa: 9.8,
    isAdmin: true,
    events: ["event_sih", "event_makeathon", "event_devclash", "event_cybershield"],
    note: "Organizing and judging campus hackathons. Ping if you have questions regarding event rules.",
  },
  {
    _id: "user_007_priya",
    name: "Priya Sen",
    email: "priya.sen@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Mobile",
    roles: ["Mobile", "Frontend"],
    skills: ["Flutter", "Dart", "React Native", "Firebase", "State Management", "REST APIs"],
    bio: "Cross-platform mobile developer. Published 4 apps on Play Store. Looking for backend partners for Makeathon!",
    links: { github: "https://github.com/priyasen", linkedin: "https://linkedin.com/in/priyasen" },
    cgpa: 9.0,
    isAdmin: false,
    events: ["event_makeathon", "event_sih"],
    note: "Ready to build offline-first companion mobile apps with instant push alerts.",
  },
  {
    _id: "user_008_vikram",
    name: "Vikram Sethi",
    email: "vikram.sethi@thapar.edu",
    branch: "Information Technology (IT)",
    year: "4th Year",
    role: "DevOps",
    roles: ["DevOps", "Backend"],
    skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "GitHub Actions", "Linux"],
    bio: "Infrastructure automation fanatic. Zero-downtime deployments and containerized staging environments for hackathons.",
    links: { github: "https://github.com/vikramsethi", linkedin: "https://linkedin.com/in/vikramsethi" },
    cgpa: 8.6,
    isAdmin: false,
    events: ["event_sih", "event_cybershield"],
    note: "Will handle all cloud deployments on AWS and maintain CI/CD pipelines so code tests automatically.",
  },
  {
    _id: "user_009_ananya",
    name: "Ananya Joshi",
    email: "ananya.j@thapar.edu",
    branch: "AI & Data Science",
    year: "2nd Year",
    role: "AI/ML",
    roles: ["AI/ML", "Data Science"],
    skills: ["Python", "TensorFlow", "Pandas", "Scikit-Learn", "Matplotlib", "Data Pipelines"],
    bio: "Data enthusiast with Kaggle Expert badge. Looking for frontend/backend peers to build predictive analytics tools.",
    links: { github: "https://github.com/ananyajoshi", linkedin: "https://linkedin.com/in/ananyajoshi" },
    cgpa: 9.4,
    isAdmin: false,
    events: ["event_devclash", "event_sih"],
    note: "Excited to train accurate predictive ML models for agricultural or healthcare datasets.",
  },
  {
    _id: "user_010_kabir",
    name: "Kabir Malhotra",
    email: "kabir.m@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "2nd Year",
    role: "Frontend",
    roles: ["Frontend"],
    skills: ["React", "Vue.js", "Tailwind CSS", "JavaScript", "HTML5/CSS3", "Git"],
    bio: "High energy UI engineer with love for interactive web graphics and intuitive student portals.",
    links: { github: "https://github.com/kabirmalhotra", linkedin: "https://linkedin.com/in/kabirmalhotra" },
    cgpa: 8.5,
    isAdmin: false,
    events: ["event_sih", "event_makeathon"],
    note: "Fast frontend builder. Can translate Figma designs into pixel-perfect React components.",
  },
  {
    _id: "user_011_meera",
    name: "Meera Iyer",
    email: "meera.iyer@thapar.edu",
    branch: "Information Technology (IT)",
    year: "3rd Year",
    role: "Cybersecurity",
    roles: ["Cybersecurity", "Backend"],
    skills: ["Penetration Testing", "OAuth2", "Cryptography", "Python", "Wireshark", "Linux"],
    bio: "CTF player and web security researcher. Want to form an elite team for CyberShield and SIH Smart Security track.",
    links: { github: "https://github.com/meeraiyer", linkedin: "https://linkedin.com/in/meeraiyer" },
    cgpa: 9.2,
    isAdmin: false,
    events: ["event_cybershield", "event_sih"],
    note: "Looking for backend engineers to build a secure multi-factor biometric authentication gateway.",
  },
  {
    _id: "user_012_arjun",
    name: "Arjun Mehta",
    email: "arjun.m@thapar.edu",
    branch: "Electronics & Communication (ECE)",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack", "IoT"],
    skills: ["Node.js", "React", "ESP32", "MQTT", "C++", "Sensors", "WebSockets"],
    bio: "Hardware meets software! I build IoT sensor systems connected to live web dashboards.",
    links: { github: "https://github.com/arjunmehta", linkedin: "https://linkedin.com/in/arjunmehta" },
    cgpa: 8.7,
    isAdmin: false,
    events: ["event_makeathon"],
    note: "Bringing real ESP32 sensors & hardware microcontrollers to Makeathon 3026.",
  },
  {
    _id: "user_013_tanvi",
    name: "Tanvi Saxena",
    email: "tanvi.s@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "4th Year",
    role: "Backend",
    roles: ["Backend"],
    skills: ["Java", "Spring Boot", "PostgreSQL", "Microservices", "Kafka", "Docker"],
    bio: "Enterprise backend dev with an internship under my belt. Strong at low latency and clean architectures.",
    links: { github: "https://github.com/tanvisaxena", linkedin: "https://linkedin.com/in/tanvisaxena" },
    cgpa: 9.6,
    isAdmin: false,
    events: ["event_sih", "event_makeathon"],
    note: "Looking for an ambitious team targeting the Smart Automation track in SIH.",
  },
  {
    _id: "user_014_harsh",
    name: "Harsh Vardhan",
    email: "harsh.v@thapar.edu",
    branch: "Computer Engineering",
    year: "2nd Year",
    role: "AI/ML",
    roles: ["AI/ML"],
    skills: ["Python", "Hugging Face", "LLMs", "RAG", "ChromaDB", "Streamlit"],
    bio: "Building custom retrieval-augmented generation (RAG) pipelines. Looking for hackathon partners for DevClash!",
    links: { github: "https://github.com/harshvardhan", linkedin: "https://linkedin.com/in/harshvardhan" },
    cgpa: 8.9,
    isAdmin: false,
    events: ["event_devclash", "event_sih"],
    note: "Can set up private local LLMs and vector search embeddings in under 2 hours.",
  },
  {
    _id: "user_015_sneha",
    name: "Sneha Kulkarni",
    email: "sneha.k@thapar.edu",
    branch: "AI & Data Science",
    year: "3rd Year",
    role: "UI/UX",
    roles: ["UI/UX", "Product"],
    skills: ["Figma", "User Research", "Interaction Design", "Prototyping", "Pitch Decks"],
    bio: "Product designer and pitch deck wizard. I specialize in turning complex technical systems into winning stories.",
    links: { github: "https://github.com/snehakulkarni", linkedin: "https://linkedin.com/in/snehakulkarni" },
    cgpa: 9.1,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Crafting the story, pitch deck, user journey, and stunning presentation slides for the jury.",
  },
  {
    _id: "user_016_rahul",
    name: "Rahul Bansal",
    email: "rahul.b@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "1st Year",
    role: "Frontend",
    roles: ["Frontend"],
    skills: ["HTML", "CSS", "JavaScript", "React", "Bootstrap", "Git"],
    bio: "Freshman enthusiastic about competitive programming and building cool web apps. Fast learner looking for a team!",
    links: { github: "https://github.com/rahulbansal", linkedin: "https://linkedin.com/in/rahulbansal" },
    cgpa: 8.4,
    isAdmin: false,
    events: ["event_makeathon", "event_sih"],
    note: "Eager to learn and contribute around the clock during the 24-hr sprint.",
  },
  {
    _id: "user_017_zoya",
    name: "Zoya Khan",
    email: "zoya.khan@thapar.edu",
    branch: "Information Technology (IT)",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack"],
    skills: ["MERN Stack", "Next.js", "Prisma", "PostgreSQL", "Tailwind CSS"],
    bio: "Fullstack engineer comfortable shipping from zero to production. Looking for teammates with creative problem statements.",
    links: { github: "https://github.com/zoyakhan", linkedin: "https://linkedin.com/in/zoyakhan" },
    cgpa: 9.0,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Let's build a smart civic complaints tracking portal with automated duplicate detection.",
  },
  {
    _id: "user_018_aditya",
    name: "Aditya Nair",
    email: "aditya.n@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "4th Year",
    role: "Backend",
    roles: ["Backend", "DevOps"],
    skills: ["Golang", "gRPC", "Docker", "PostgreSQL", "Redis", "Distributed Systems"],
    bio: "Golang developer passionate about ultra-fast concurrency and microservice efficiency. SIH veteran.",
    links: { github: "https://github.com/adityanair", linkedin: "https://linkedin.com/in/adityanair" },
    cgpa: 9.4,
    isAdmin: false,
    events: ["event_sih", "event_cybershield"],
    note: "Experienced with hackathon scoring rubrics. Looking for serious teammates aiming for top 3.",
  },
  {
    _id: "user_019_pooja",
    name: "Pooja Agarwal",
    email: "pooja.a@thapar.edu",
    branch: "Biotechnology",
    year: "3rd Year",
    role: "AI/ML",
    roles: ["AI/ML", "Bioinformatics"],
    skills: ["Python", "Biopython", "Machine Learning", "Data Analysis", "R"],
    bio: "Biotech major building healthcare and medical diagnostics software with AI. Let's tackle healthcare in SIH!",
    links: { github: "https://github.com/poojaagarwal", linkedin: "https://linkedin.com/in/poojaagarwal" },
    cgpa: 9.3,
    isAdmin: false,
    events: ["event_sih"],
    note: "Have a real dataset on antibiotic resistance ready for classification modeling.",
  },
  {
    _id: "user_020_karthik",
    name: "Karthik Pillai",
    email: "karthik.p@thapar.edu",
    branch: "Computer Engineering",
    year: "2nd Year",
    role: "Mobile",
    roles: ["Mobile"],
    skills: ["React Native", "Expo", "Redux", "Firebase", "TypeScript"],
    bio: "React Native developer who loves fast animations and smooth touch gestures. Ready to sprint!",
    links: { github: "https://github.com/karthikpillai", linkedin: "https://linkedin.com/in/karthikpillai" },
    cgpa: 8.6,
    isAdmin: false,
    events: ["event_makeathon"],
    note: "Building the mobile client for team project.",
  },
  {
    _id: "user_021_shreya",
    name: "Shreya Sen",
    email: "shreya.s@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Frontend",
    roles: ["Frontend"],
    skills: ["React", "Three.js", "Tailwind CSS", "GSAP", "Web Audio API"],
    bio: "Frontend developer who blends 3D animations with intuitive accessibility. Looking for Web & AI teammates.",
    links: { github: "https://github.com/shreyasen", linkedin: "https://linkedin.com/in/shreyasen" },
    cgpa: 9.2,
    isAdmin: false,
    events: ["event_makeathon", "event_devclash"],
    note: "Can integrate interactive 3D visualizations into our hackathon pitch.",
  },
  {
    _id: "user_022_mohit",
    name: "Mohit Aggarwal",
    email: "mohit.a@thapar.edu",
    branch: "Mechanical Engineering",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack", "Robotics"],
    skills: ["Python", "ROS2", "OpenCV", "Flask", "React", "CAD"],
    bio: "Autonomous robotics enthusiast and maker. Let's build a software+hardware prototype at Makeathon 3026!",
    links: { github: "https://github.com/mohitaggarwal", linkedin: "https://linkedin.com/in/mohitaggarwal" },
    cgpa: 8.8,
    isAdmin: false,
    events: ["event_makeathon"],
    note: "Have robot rover chassis and camera ready for autonomous navigation challenge.",
  },
  {
    _id: "user_023_kriti",
    name: "Kriti Mittal",
    email: "kriti.m@thapar.edu",
    branch: "Information Technology (IT)",
    year: "2nd Year",
    role: "UI/UX",
    roles: ["UI/UX"],
    skills: ["Figma", "User Testing", "Illustrator", "Canva", "Product Strategy"],
    bio: "Passionate about human-centered design. I design interfaces that non-technical judges can understand in 30 seconds.",
    links: { github: "https://github.com/kritimittal", linkedin: "https://linkedin.com/in/kritimittal" },
    cgpa: 9.0,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Ensuring high score in innovation and user experience categories.",
  },
  {
    _id: "user_024_varun",
    name: "Varun Singla",
    email: "varun.s@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "DevOps",
    roles: ["DevOps", "Backend"],
    skills: ["Docker", "Linux", "Nginx", "Kubernetes", "Shell Scripting", "Prometheus"],
    bio: "System reliability engineer in training. I set up monitoring, log aggregation, and resilient server setups.",
    links: { github: "https://github.com/varunsingla", linkedin: "https://linkedin.com/in/varunsingla" },
    cgpa: 8.7,
    isAdmin: false,
    events: ["event_sih", "event_cybershield"],
    note: "Will guarantee our backend API demo never crashes during jury evaluation.",
  },
  {
    _id: "user_025_neha",
    name: "Neha Bhatt",
    email: "neha.b@thapar.edu",
    branch: "Electronics & Communication (ECE)",
    year: "4th Year",
    role: "AI/ML",
    roles: ["AI/ML"],
    skills: ["PyTorch", "Computer Vision", "YOLOv8", "Deep Learning", "TensorRT"],
    bio: "Computer vision developer. Trained real-time object detection models for smart traffic and drone monitoring.",
    links: { github: "https://github.com/nehabhatt", linkedin: "https://linkedin.com/in/nehabhatt" },
    cgpa: 9.5,
    isAdmin: false,
    events: ["event_devclash", "event_sih"],
    note: "Building an automated safety helmet detection system for construction sites.",
  },
  {
    _id: "user_026_siddharth",
    name: "Siddharth Roy",
    email: "siddharth.r@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "2nd Year",
    role: "Backend",
    roles: ["Backend"],
    skills: ["Python", "Django", "PostgreSQL", "Celery", "Redis", "Docker"],
    bio: "Backend developer with strong database normalization and queue management skills. Ready to build!",
    links: { github: "https://github.com/siddharthroy", linkedin: "https://linkedin.com/in/siddharthroy" },
    cgpa: 8.6,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Can set up background workers for heavy AI pipeline jobs.",
  },
  {
    _id: "user_027_ishaan",
    name: "Ishaan Goyal",
    email: "ishaan.g@thapar.edu",
    branch: "Computer Engineering",
    year: "1st Year",
    role: "Frontend",
    roles: ["Frontend"],
    skills: ["React", "JavaScript", "CSS3", "Tailwind CSS", "Git"],
    bio: "Enthusiastic beginner web developer with a knack for rapid prototype assembly.",
    links: { github: "https://github.com/ishaangoyal", linkedin: "https://linkedin.com/in/ishaangoyal" },
    cgpa: 8.3,
    isAdmin: false,
    events: ["event_makeathon"],
    note: "Looking to join an experienced senior team to learn and build.",
  },
  {
    _id: "user_028_simran",
    name: "Simran Kaur",
    email: "simran.k@thapar.edu",
    branch: "Information Technology (IT)",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack"],
    skills: ["TypeScript", "Next.js", "Node.js", "MongoDB", "Tailwind CSS", "GraphQL"],
    bio: "Fullstack web developer focused on clean modern codebases and lightning fast load times.",
    links: { github: "https://github.com/simrankaur", linkedin: "https://linkedin.com/in/simrankaur" },
    cgpa: 9.1,
    isAdmin: false,
    events: ["event_sih", "event_makeathon", "event_devclash"],
    note: "Experienced in end-to-end fullstack development. Let's team up!",
  },
  {
    _id: "user_029_manish",
    name: "Manish Tiwari",
    email: "manish.t@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Cybersecurity",
    roles: ["Cybersecurity"],
    skills: ["Network Security", "Burp Suite", "OWASP Top 10", "Python", "Bash", "SIEM"],
    bio: "Ethical hacker and vulnerability analyst. Looking for teammates to build defensive cyber tools.",
    links: { github: "https://github.com/manishtiwari", linkedin: "https://linkedin.com/in/manishtiwari" },
    cgpa: 8.9,
    isAdmin: false,
    events: ["event_cybershield", "event_sih"],
    note: "Focused on securing APIs against prompt injection and cross-site scripting.",
  },
  {
    _id: "user_030_riya",
    name: "Riya Chawla",
    email: "riya.c@thapar.edu",
    branch: "AI & Data Science",
    year: "2nd Year",
    role: "AI/ML",
    roles: ["AI/ML"],
    skills: ["NLP", "Transformers", "spaCy", "Python", "BERT", "FastAPI"],
    bio: "Natural language processing enthusiast. Building multilingual summarizers and voice-to-text assistants.",
    links: { github: "https://github.com/riyachawla", linkedin: "https://linkedin.com/in/riyachawla" },
    cgpa: 9.3,
    isAdmin: false,
    events: ["event_devclash", "event_sih"],
    note: "Let's build a regional language voice assistant for rural healthcare services.",
  },
  {
    _id: "user_031_gurpreet",
    name: "Gurpreet Singh",
    email: "gurpreet.s@thapar.edu",
    branch: "Computer Science (CSE)",
    year: "3rd Year",
    role: "Fullstack",
    roles: ["Fullstack"],
    skills: ["React", "Express", "Node.js", "PostgreSQL", "Docker", "Tailwind CSS"],
    bio: "Thapar student excited to partner with cross-college hackathon teammates for SIH 2026!",
    links: { github: "https://github.com/gurpreetsingh", linkedin: "https://linkedin.com/in/gurpreetsingh" },
    cgpa: 9.1,
    isAdmin: false,
    events: ["event_sih", "event_devclash"],
    note: "Ready to collaborate and build high-impact software for national problem statements.",
  },
  {
    _id: "user_032_karan",
    name: "Karan Bhatia",
    email: "karan.b@thapar.edu",
    branch: "Information Technology (IT)",
    year: "4th Year",
    role: "Frontend",
    roles: ["Frontend", "UI/UX"],
    skills: ["React", "Next.js", "Figma", "Tailwind CSS", "Storybook", "TypeScript"],
    bio: "Senior UI developer with 5 production projects. Ready to deliver a stunning frontend for SIH.",
    links: { github: "https://github.com/karanbhatia", linkedin: "https://linkedin.com/in/karanbhatia" },
    cgpa: 8.9,
    isAdmin: false,
    events: ["event_sih", "event_makeathon"],
    note: "Fast and reliable UI developer. Let's win first place!",
  },
];

async function seedDatabase() {
  console.log("🌱 Starting HackMate Comprehensive Database Seeder...");

  // 1. Hash default password for all students
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("password123", salt);

  // 2. Prepare normalized users
  const usersToSave = STUDENTS_RAW.map((s) => ({
    _id: s._id,
    name: s.name,
    email: s.email.toLowerCase().trim(),
    password: defaultPasswordHash,
    branch: s.branch,
    year: s.year,
    role: s.role,
    roles: s.roles || [s.role],
    skills: s.skills,
    techStack: s.skills,
    bio: s.bio,
    links: s.links,
    cgpa: s.cgpa,
    isAdmin: Boolean(s.isAdmin),
    isAvailable: true,
    lookingForTeam: true,
    events: s.events,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.name)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 3. Prepare participations
  const participationsToSave = [];
  STUDENTS_RAW.forEach((s) => {
    (s.events || []).forEach((evId) => {
      participationsToSave.push({
        _id: `part_${s._id}_${evId}`,
        user: s._id,
        event: evId,
        note: s.note || "Excited to collaborate and build high-impact hackathon projects!",
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    });
  });

  // Calculate actual participant counts for events
  const countsByEvent = {};
  participationsToSave.forEach((p) => {
    countsByEvent[p.event] = (countsByEvent[p.event] || 0) + 1;
  });

  const eventsToSave = SEED_EVENTS.map((ev) => ({
    ...ev,
    participantsCount: countsByEvent[ev._id] || ev.participantsCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // 4. Save to Local JSON database (Guarantees zero-setup instant demo)
  console.log("💾 Writing to local resilient JSON database fallback...");
  localDb.saveEvents(eventsToSave);
  localDb.saveUsers(usersToSave);
  localDb.saveParticipations(participationsToSave);
  // Clear test swipes/matches so deck is fresh
  localDb.saveSwipes([]);
  localDb.saveMatches([]);
  localDb.saveMessages([]);
  console.log("   ✅ Saved to local JSON database: 4 Events, 32 Students, and Participations.");

  // 5. Connect and sync to MongoDB if MONGO_URI is configured
  const MONGO_URI = process.env.MONGO_URI;
  if (MONGO_URI) {
    try {
      console.log("🌐 Connecting to MongoDB for cloud synchronization...");
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("   ✅ MongoDB connection established.");

      // Sync Events
      await Event.deleteMany({});
      for (const ev of eventsToSave) {
        const eDoc = new Event(ev);
        await eDoc.save();
      }
      console.log(`   ✅ Synced ${eventsToSave.length} Hackathon Events to MongoDB.`);

      // Sync Users
      await User.deleteMany({});
      for (const u of usersToSave) {
        const uDoc = new User(u);
        await uDoc.save();
      }
      console.log(`   ✅ Synced ${usersToSave.length} Student Profiles to MongoDB.`);

      // Sync Participations
      await EventParticipation.deleteMany({});
      for (const p of participationsToSave) {
        const pDoc = new EventParticipation(p);
        await pDoc.save();
      }
      console.log(`   ✅ Synced ${participationsToSave.length} Event Participations to MongoDB.`);

      // Clear test swipes & matches in MongoDB
      await Swipe.deleteMany({});
      await Match.deleteMany({});
      await Message.deleteMany({});
    } catch (dbErr) {
      console.warn("⚠️ Note: MongoDB cloud sync skipped or timed out:", dbErr.message);
      console.log("⚡ Zero-setup Local JSON database will be used automatically.");
    } finally {
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }

  console.log("\n🎉 Database Seed Completed Successfully!");
  console.log("   - 4 Hackathons available");
  console.log("   - 32 Verified students created (Password for all: password123)");
  console.log("   - Key test accounts:");
  console.log("     * Alice Sharma (Frontend): alice@thapar.edu");
  console.log("     * Bob Patel (Backend): bob@thapar.edu");
  console.log("     * Charlie Verma (AI/ML): charlie@thapar.edu");
  console.log("     * Divya Nair (UI/UX): divya@thapar.edu");
  console.log("     * Campus Admin: admin@thapar.edu");
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
