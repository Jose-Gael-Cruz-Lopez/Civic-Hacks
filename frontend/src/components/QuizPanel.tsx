'use client';

import { useState } from 'react';
import { GraphNode, QuizQuestion, QuizResult } from '@/lib/types';
import { generateQuiz, submitQuiz } from '@/lib/api';

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
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Select Concept
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
            {nodes.map(n => (
              <label
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  border: `1px solid ${selectedNodeId === n.id ? '#111827' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedNodeId === n.id ? '#f9fafb' : '#ffffff',
                }}
              >
                <input
                  type="radio"
                  name="concept"
                  value={n.id}
                  checked={selectedNodeId === n.id}
                  onChange={() => setSelectedNodeId(n.id)}
                />
                <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{n.concept_name}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{Math.round(n.mastery_score * 100)}%</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Questions
            </p>
            <select
              value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
            >
              {[5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Difficulty
            </p>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
            >
              {['easy', 'medium', 'hard', 'adaptive'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>}

        <button
          onClick={startQuiz}
          disabled={!selectedNodeId || loading}
          style={{
            padding: '10px 20px',
            background: '#111827',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: selectedNodeId && !loading ? 'pointer' : 'not-allowed',
            opacity: !selectedNodeId || loading ? 0.5 : 1,
          }}
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
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>
          Question {currentQ + 1} of {questions.length}
        </p>
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#111827', lineHeight: 1.6 }}>{q.question}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.options.map(opt => {
            let borderColor = '#e5e7eb';
            let bg = '#ffffff';
            if (phase === 'review') {
              if (opt.correct) { borderColor = '#22c55e'; bg = '#f0fdf4'; }
              else if (opt.label === selectedAnswer && !opt.correct) { borderColor = '#ef4444'; bg = '#fef2f2'; }
            } else if (selectedAnswer === opt.label) {
              borderColor = '#111827';
              bg = '#f9fafb';
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
                  color: '#374151',
                }}
              >
                <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '16px' }}>{opt.label}</span>
                {opt.text}
              </button>
            );
          })}
        </div>

        {phase === 'review' && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
            <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{q.explanation}</p>
            {!reviewData?.correct && onLearnConcept && (
              <button
                onClick={() => onLearnConcept(q.concept_tested)}
                style={{ marginTop: '8px', background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
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
              style={{
                padding: '8px 16px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                opacity: selectedAnswer ? 1 : 0.5,
              }}
            >
              Submit
            </button>
          )}
          {phase === 'review' && (
            <button
              onClick={nextQuestion}
              style={{
                padding: '8px 16px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
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
          <p style={{ fontSize: '36px', fontWeight: 700, color: '#111827' }}>{results.score}/{results.total}</p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>{pct}% correct</p>
          <p style={{ fontSize: '13px', color: masteryDelta >= 0 ? '#22c55e' : '#ef4444', marginTop: '4px' }}>
            Mastery: {masteryDelta >= 0 ? '+' : ''}{masteryDelta}%
          </p>
        </div>

        <div>
          {results.results.map((r, i) => (
            <div key={r.question_id} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: i < results.results.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <span style={{ fontSize: '13px', color: r.correct ? '#22c55e' : '#ef4444', fontWeight: 600, minWidth: '20px' }}>
                {r.correct ? 'Y' : 'N'}
              </span>
              <span style={{ fontSize: '13px', color: '#374151' }}>Q{i + 1}</span>
              {!r.correct && (
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Correct: {r.correct_answer}</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={reset}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#374151',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Retake
          </button>
          {onLearnConcept && (
            <button
              onClick={() => onLearnConcept('')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: '#111827',
                color: '#ffffff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
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
