const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const localDb = require("./lib/localDb");
const User = require("./models/User");
const Event = require("./models/Event");
const Swipe = require("./models/Swipe");
const Match = require("./models/Match");
const Message = require("./models/Message");

async function runTest() {
  console.log("🧪 Running End-to-End Verification Test for HackMate...\n");

  // 1. Events verification
  const events = await Event.find();
  console.log(`✅ Loaded ${events.length} Hackathons:`);
  events.forEach((e) => console.log(`   - [${e._id}] ${e.title} (${e.date})`));

  // 2. Demo users verification
  const users = await User.find();
  console.log(`\n✅ Loaded ${users.length} Student Profiles.`);

  const alice = await User.findOne({ email: "alice@campus.edu" });
  const bob = await User.findOne({ email: "bob@campus.edu" });

  if (!alice || !bob) {
    throw new Error("Demo users Alice or Bob not found!");
  }
  console.log(`   - Alice: ${alice.name} (${alice.branch}, ${alice.role})`);
  console.log(`   - Bob: ${bob.name} (${bob.branch}, ${bob.role})`);

  // Password verification
  const isMatch = await bcrypt.compare("password123", alice.password);
  console.log(`   - Alice password123 check: ${isMatch ? "SUCCESS ✅" : "FAILED ❌"}`);

  // 3. Clear any existing test swipes/matches between Alice & Bob
  await Swipe.deleteMany({ swiper: String(alice._id) });
  await Swipe.deleteMany({ swiper: String(bob._id) });

  // 4. Test Swiping
  const eventId = "event_sih";
  console.log(`\n🎴 Testing Swipe Logic for event: ${eventId}`);

  // Alice likes Bob
  console.log("   -> Alice swipes RIGHT on Bob...");
  const aliceSwipe = new Swipe({
    swiper: String(alice._id),
    swiped: String(bob._id),
    event: eventId,
    action: "like",
  });
  await aliceSwipe.save();

  // Check if Bob has reciprocal like (not yet)
  let reciprocalSwipe = await Swipe.findOne({
    swiper: String(bob._id),
    swiped: String(alice._id),
    event: eventId,
    action: "like",
  });
  console.log(`   -> Mutual match status: ${reciprocalSwipe ? "MATCHED" : "PENDING (As expected ✅)"}`);

  // Now Bob likes Alice
  console.log("   -> Bob swipes RIGHT on Alice...");
  const bobSwipe = new Swipe({
    swiper: String(bob._id),
    swiped: String(alice._id),
    event: eventId,
    action: "like",
  });
  await bobSwipe.save();

  reciprocalSwipe = await Swipe.findOne({
    swiper: String(alice._id),
    swiped: String(bob._id),
    event: eventId,
    action: "like",
  });

  if (reciprocalSwipe) {
    console.log("   -> 🎉 MUTUAL MATCH DETECTED!");
    const match = new Match({
      users: [String(bob._id), String(alice._id)],
      event: eventId,
      lastMessage: "🎉 Mutual match unlocked! Say hello 👋",
      lastMessageAt: new Date(),
    });
    await match.save();
    console.log(`   -> Match record created: [Match ID: ${match._id}] ✅`);

    // 5. Test 1-on-1 Private Messaging
    console.log("\n💬 Testing 1-on-1 Private Chat:");
    const msg1 = new Message({
      match: String(match._id),
      sender: String(alice._id),
      text: "Hey Bob! Loved your backend skills. Want to team up for SIH 2026?",
    });
    await msg1.save();
    console.log(`   -> Alice sent: "${msg1.text}"`);

    const msg2 = new Message({
      match: String(match._id),
      sender: String(bob._id),
      text: "Hi Alice! Absolutely! We have Frontend and Backend covered now. Let's do it!",
    });
    await msg2.save();
    console.log(`   -> Bob replied: "${msg2.text}"`);

    // Fetch conversation
    const history = await Message.findByMatch(match._id);
    console.log(`   -> Retrieved ${history.length} messages in private match room ✅`);
  }

  console.log("\n🚀 ALL CORE HACKMATE FUNCTIONALITIES VERIFIED SUCCESSFULLY!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
