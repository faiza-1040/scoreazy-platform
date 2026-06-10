require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const initialCourses = [
  {
    title: 'Confidence Explorers',
    description: 'Introduce your little ones to the basics of self-expression, sharing, and overcoming shyness through colorful games, interactive puppets, and storytelling.',
    ageGroup: 'Grades K-2',
    price: 29,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'My Name & My Voice', description: 'Interactive circle games introducing ourselves loudly, clearly, and proudly.' },
      { day: 2, title: 'Emotion Charades', description: 'Learning how to read and express feelings using facial expressions and body posture.' },
      { day: 3, title: 'The Puppet Show', description: 'Practicing talking through friendly puppets to express opinions comfortably.' },
      { day: 4, title: 'Story Circle Sharing', description: 'Presenting a favorite toy or drawing to a small, encouraging peer group.' },
      { day: 5, title: 'Explorers Graduation', description: 'Standing up to receive the explorer\'s badge and sharing one thing we are proud of.' }
    ]
  },
  {
    title: 'Confidence Builders',
    description: 'Empower elementary students to speak up, participate in discussions, and share ideas confidently using proven techniques in educational psychology.',
    ageGroup: 'Grades 3-5',
    price: 49,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'Breaking the Ice', description: 'Fun speed-meeting games and understanding key body language cues.' },
      { day: 2, title: 'Speaking with Eyes', description: 'Understanding active listening and maintaining positive, natural eye contact.' },
      { day: 3, title: 'The Storyteller\'s Pitch', description: 'Vocal variety exercise: practicing changing volume, speed, and pitch for dramatic effect.' },
      { day: 4, title: 'Impromptu Fun', description: 'Mini quick-thinking games to speak without preparation on funny, simple subjects.' },
      { day: 5, title: 'Graduation Presentation', description: 'Delivering a 1-minute speech about a dream or goal in front of the group.' }
    ]
  },
  {
    title: 'Confidence Champions',
    description: 'Empower older kids to lead group projects, handle public speaking anxiety, master presentation skills, and stand out in both social and academic circles.',
    ageGroup: 'Grades 6-8',
    price: 59,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'First Impressions & Leadership', description: 'Professional posture, confidence-handshakes, and positive self-introductions.' },
      { day: 2, title: 'Debating with Heart', description: 'Learning how to formulate arguments and respectfully express agreement and disagreement.' },
      { day: 3, title: 'Mastering Stage Fright', description: 'Mental breathing techniques and physical hacks to manage speaking anxiety.' },
      { day: 4, title: 'Presenting with Impact', description: 'Structuring a short persuasive speech with an attention-grabber, body points, and a call to action.' },
      { day: 5, title: 'Champion\'s Showcase', description: 'Presenting a structured presentation and receiving positive constructive feedback from peers.' }
    ]
  },
  {
    title: 'Social Skills Safari',
    description: 'Help your child explore friendship-building, empathy, and positive peer collaboration through guided safari-themed stories and roleplay.',
    ageGroup: 'Grades K-2',
    price: 35,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'Friendly Connections', description: 'Learning how to initiate conversations, say hello, and ask to join games.' },
      { day: 2, title: 'Active Listening Ears', description: 'Fun games that teach how to wait for our turn to speak and show we are listening.' },
      { day: 3, title: 'Sharing & Empathy', description: 'Story-based exercises discussing cooperation, sharing, and understanding friends\' feelings.' },
      { day: 4, title: 'Resolving Playground Scuffles', description: 'Playful roleplay on how to handle small playground disagreements calmly.' },
      { day: 5, title: 'Safari Celebration', description: 'A group team-building activity celebrating collaboration and receiving a friendship badge.' }
    ]
  },
  {
    title: 'Creative Storytellers',
    description: 'Unlock your child\'s imagination. This course develops descriptive writing, emotional expression, and animated voice acting for young tellers.',
    ageGroup: 'Grades 3-5',
    price: 45,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'World of Imagination', description: 'Brainstorming fantasy worlds, original characters, and starting stories with an exciting hook.' },
      { day: 2, title: 'Character Expressions', description: 'Using character voices, sound effects, and body shapes to represent story characters.' },
      { day: 3, title: 'The Rollercoaster Plot', description: 'Structuring stories with a solid beginning, an engaging middle problem, and a resolution.' },
      { day: 4, title: 'Painting with Words', description: 'Descriptive vocabulary games using sensory details (sight, sound, touch) to bring stories to life.' },
      { day: 5, title: 'Slam Storytelling Showcase', description: 'Sharing our completed original story with animated voice and physical gestures.' }
    ]
  },
  {
    title: 'Junior Debate Circle',
    description: 'Introduce your teen or pre-teen to critical thinking, structured argumentation, respectful debating, and rebuttal techniques.',
    ageGroup: 'Grades 6-8',
    price: 65,
    duration: '5 Days',
    syllabus: [
      { day: 1, title: 'Arguments & Evidence', description: 'Differentiating between personal opinions and fact-based logical arguments.' },
      { day: 2, title: 'The Art of Rebuttal', description: 'Respectfully dissecting opposing viewpoints and addressing them logically.' },
      { day: 3, title: 'Cross-Examination', description: 'Asking constructive, sharp questions to challenge statements without being aggressive.' },
      { day: 4, title: 'Persuasive Rhetoric', description: 'Vocal delivery, pauses, emphasis, and tone to convey credibility and power.' },
      { day: 5, title: 'Live Circle Debate', description: 'A friendly, structured team debate on recess lengths or screen time, judged by peers.' }
    ]
  }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scoreazy';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing courses...');
    await Course.deleteMany({});

    console.log('Inserting default courses...');
    const inserted = await Course.insertMany(initialCourses);
    console.log(`Successfully seeded ${inserted.length} courses:`);
    console.log(inserted);

    await mongoose.disconnect();
    console.log('Database seeded successfully and disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
