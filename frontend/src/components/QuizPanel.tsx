'use client';

import { useState } from 'react';
import { GraphNode, QuizQuestion, QuizResult } from '@/lib/types';
import { generateQuiz, submitQuiz } from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';

interface Props {
  nodes: GraphNode[];
  userId: string;
  onLearnConcept?: (concept: string) => void;
}

type Phase = 'select' | 'active' | 'review' | 'results';

export default function QuizPanel({ nodes, userId, onLearnConcept }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  const [quizId, setQuizId] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ question_id: number; selected_label: string }[]>([]);
  const [reviewData, setReviewData] = useState<QuizResult | null>(null);

  const [results, setResults] = useState<{ score: number; total: number; mastery_before: number; mastery_after: number; results: QuizResult[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startQuiz = async () => {
    if (!selectedNodeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await generateQuiz(userId, selectedNodeId, numQuestions, difficulty);
      setQuizId(res.quiz_id);
      setQuestions(res.questions);
      setCurrentQ(0);
      setAnswers([]);
      setPhase('active');
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    if (!selectedAnswer) return;
    const q = questions[currentQ];
    const correctOpt = q.options.find(o => o.correct);
    const isCorrect = selectedAnswer === correctOpt?.label;
    const result: QuizResult = {
      question_id: q.id,
      selected: selectedAnswer,
      correct: isCorrect,
      correct_answer: correctOpt?.label ?? '',
      explanation: q.explanation,
    };
    setReviewData(result);
    setAnswers(prev => [...prev, { question_id: q.id, selected_label: selectedAnswer }]);
    setPhase('review');
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setReviewData(null);
    if (currentQ + 1 < questions.length) {
      setCurrentQ(prev => prev + 1);
      setPhase('active');
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const res = await submitQuiz(quizId, answers);
      setResults(res);
      setPhase('results');
    } catch (e: any) {
      setError(e.message || 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('select');
    setResults(null);
    setAnswers([]);
    setSelectedAnswer(null);
    setReviewData(null);
    setQuizId('');
    setQuestions([]);
    setCurrentQ(0);
  };

  if (phase === 'select') {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <p className="label" style={{ marginBottom: '8px' }}>Select Concept</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
            {nodes.map(n => (
              <label
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  border: `1px solid ${selectedNodeId === n.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedNodeId === n.id ? 'var(--accent-dim)' : 'var(--bg-subtle)',
                }}
              >
                <input
                  type="radio"
                  name="concept"
                  value={n.id}
                  checked={selectedNodeId === n.id}
                  onChange={() => setSelectedNodeId(n.id)}
                />
                <span style={{ fontSize: '14px', color: 'var(--text)', flex: 1 }}>{n.concept_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{Math.round(n.mastery_score * 100)}%</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <p className="label" style={{ marginBottom: '6px' }}>Questions</p>
            <CustomSelect
              value={String(numQuestions)}
              onChange={val => setNumQuestions(Number(val))}
              options={[5, 10, 15].map(n => ({ value: String(n), label: String(n) }))}
              compact
            />
          </div>
          <div>
            <p className="label" style={{ marginBottom: '6px' }}>Difficulty</p>
            <CustomSelect
              value={difficulty}
              onChange={val => setDifficulty(val)}
              options={['easy', 'medium', 'hard', 'adaptive'].map(d => ({ value: d, label: d }))}
              compact
            />
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

        <button
          onClick={startQuiz}
          disabled={!selectedNodeId || loading}
          className="btn-accent"
          style={{ cursor: selectedNodeId && !loading ? 'pointer' : 'not-allowed', opacity: !selectedNodeId || loading ? 0.4 : 1 }}
        >
          {loading ? 'Generating...' : 'Start Quiz'}
        </button>
      </div>
    );
  }

  if (phase === 'active' || phase === 'review') {
    const q = questions[currentQ];
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Question {currentQ + 1} of {questions.length}
        </p>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.6 }}>{q.question}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.options.map(opt => {
            let borderColor = 'var(--border)';
            let bg = 'var(--bg-subtle)';
            if (phase === 'review') {
              if (opt.correct) { borderColor = 'rgba(22,163,74,0.5)'; bg = 'rgba(22,163,74,0.08)'; }
              else if (opt.label === selectedAnswer && !opt.correct) { borderColor = 'rgba(220,38,38,0.5)'; bg = 'rgba(220,38,38,0.08)'; }
            } else if (selectedAnswer === opt.label) {
              borderColor = 'var(--accent-border)';
              bg = 'var(--accent-dim)';
            }

            return (
              <button
                key={opt.label}
                onClick={() => phase === 'active' && setSelectedAnswer(opt.label)}
                disabled={phase === 'review'}
                style={{
                  padding: '10px 14px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  background: bg,
                  textAlign: 'left',
                  cursor: phase === 'active' ? 'pointer' : 'default',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  fontSize: '14px',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-dim)', minWidth: '16px' }}>{opt.label}</span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {phase === 'review' && (
          <div className="panel" style={{ padding: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{q.explanation}</p>
            {!reviewData?.correct && onLearnConcept && (
              <button
                onClick={() => onLearnConcept(q.concept_tested)}
                style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Explain this
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          {phase === 'active' && (
            <button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              className="btn-accent"
              style={{ cursor: selectedAnswer ? 'pointer' : 'not-allowed', opacity: selectedAnswer ? 1 : 0.4 }}
            >
              Submit
            </button>
          )}
          {phase === 'review' && (
            <button
              onClick={nextQuestion}
              className="btn-accent"
            >
              {currentQ + 1 < questions.length ? 'Next' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results' && results) {
    const pct = Math.round((results.score / results.total) * 100);
    const masteryDelta = Math.round((results.mastery_after - results.mastery_before) * 100);
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text)' }}>{results.score}/{results.total}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{pct}% correct</p>
          <p style={{ fontSize: '13px', color: masteryDelta >= 0 ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
            Mastery: {masteryDelta >= 0 ? '+' : ''}{masteryDelta}%
          </p>
        </div>

        <div>
          {results.results.map((r, i) => (
            <div key={r.question_id} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: i < results.results.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: '13px', color: r.correct ? '#16a34a' : '#dc2626', fontWeight: 600, minWidth: '20px' }}>
                {r.correct ? 'Y' : 'N'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Q{i + 1}</span>
              {!r.correct && (
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Correct: {r.correct_answer}</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={reset}
            className="btn-ghost"
            style={{ flex: 1 }}
          >
            Retake
          </button>
          {onLearnConcept && (
            <button
              onClick={() => onLearnConcept('')}
              className="btn-accent"
              style={{ flex: 1 }}
            >
              Learn Weak Areas
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
