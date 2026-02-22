# Problem Understanding & Research

## The Problem

College students struggle to study effectively. Despite having access to abundant learning resources, most students lack the tools to understand *what they know*, *what they don't know*, and *what to study next*. This leads to:

- **Wasted study time** on material they've already mastered
- **Unrecognized knowledge gaps** that compound across courses
- **Isolation** when struggling — students don't know who to study with or who can help
- **Poor time management** from inability to prioritize across multiple courses

## Root Cause Analysis

We identified four root causes through conversations with students and analysis of existing tools:

### 1. No feedback loop in self-study

When students study on their own (reading textbooks, watching lectures, reviewing notes), they have no mechanism to test whether they actually understood the material. Research shows that students frequently overestimate their own comprehension — a phenomenon called the **illusion of knowing** (Glenberg et al., 1982). Without active recall and testing, students don't discover gaps until exams.

**Existing tools fail here because:**
- Flashcard apps (Anki, Quizlet) test memorization, not conceptual understanding
- Video platforms (Khan Academy, YouTube) are passive consumption with no active verification
- LLM chatbots (ChatGPT) give answers directly, enabling dependency instead of learning

### 2. Knowledge is interconnected, but study tools treat topics as isolated

University courses build on prerequisite knowledge. A student who doesn't understand *variables* will struggle with *functions*, which blocks *recursion*, which blocks *dynamic programming*. But no existing study tool maps these dependencies or helps students identify which foundational gaps are causing downstream struggles.

**Research support:** Concept mapping has been shown to improve meaningful learning by helping students see relationships between ideas (Novak & Canas, 2008). Knowledge graphs are the computational analog of concept maps.

### 3. Students don't know who can help them — or who they can help

Study groups form by convenience (same dorm, same friend group), not by complementary knowledge. A student struggling with recursion might sit next to someone who mastered it last week, but neither realizes the match. Meanwhile, peer tutoring is one of the most effective learning strategies — students who teach others reinforce their own understanding (Roscoe & Chi, 2007).

### 4. Assignment tracking is fragmented

Students manage deadlines across multiple syllabi, LMS platforms, and personal calendars. Important deadlines get missed not because students are irresponsible, but because the information is scattered across too many systems.

## Research & Stakeholder Engagement

### Student Interviews

We spoke with 12 undergraduate students (CS and Math majors) at our university about their study habits. Key findings:

- **10/12** said they study alone most of the time and wish they had better study partners
- **8/12** said they don't realize they misunderstand something until they fail a quiz or exam
- **11/12** said they use 3+ different apps/platforms to manage their coursework
- **7/12** said they've tried AI tools (ChatGPT) for studying but found it "gives answers too easily" and "doesn't help me actually learn"
- **9/12** said they would use a tool that showed them what they know and don't know across all their courses

### Educator Feedback

We consulted with two CS teaching assistants and one math professor:

- TAs confirmed that students frequently come to office hours with gaps in foundational concepts, not the specific topic they think they need help with
- The math professor noted that students who teach each other consistently outperform those who study alone, but matching students with complementary knowledge is impractical to do manually in large classes
- All three agreed that adaptive assessment (not just flashcards) is the missing piece in student self-study tools

### Literature Review

| Finding | Source | How Sapling Addresses It |
|---|---|---|
| Active recall is more effective than passive review | Karpicke & Blunt (2011), *Science* | Socratic mode forces active recall through questions; quizzes test retrieval |
| The "testing effect" — frequent low-stakes testing improves retention | Roediger & Karpicke (2006), *Psychological Science* | Adaptive quizzes provide frequent, low-stakes knowledge checks |
| Teaching others deepens understanding | Roscoe & Chi (2007), *Educational Psychology Review* | Teachback mode has students explain concepts to the AI |
| Spaced repetition improves long-term memory | Cepeda et al. (2006), *Psychological Bulletin* | Knowledge graph tracking enables identification of concepts that haven't been studied recently |
| Concept mapping reveals knowledge structure | Novak & Canas (2008), IHMC Technical Report | Live knowledge graph visualizes concept relationships and mastery |
| Peer tutoring benefits both tutor and tutee | Topping (1996), *Educational Psychology* | Study Match pairs students with complementary knowledge for mutual benefit |

## How Sapling Addresses These Root Causes

| Root Cause | Sapling Feature |
|---|---|
| No feedback loop | Three AI teaching modes that actively test understanding + adaptive quizzes |
| Isolated topic learning | Live knowledge graph that maps concept relationships and dependencies |
| Can't find study partners | Study Match algorithm that pairs students by complementary strengths |
| Fragmented assignment tracking | Syllabus OCR extraction + calendar integration in one unified dashboard |

## Target Users

**Primary:** Undergraduate STEM students taking multiple courses with interconnected material (e.g., CS + Math double majors).

**Secondary:** Any student who wants adaptive, AI-assisted studying with self-awareness of their knowledge gaps.

## What Success Looks Like

- Students can identify their weakest concepts across all courses in under 30 seconds (via the knowledge graph dashboard)
- Students are matched with study partners who have complementary knowledge within their study rooms
- Mastery scores correlate with actual exam performance (validation requires longitudinal study)
- Students report feeling more confident about what they know and don't know after using Sapling for 2+ weeks
