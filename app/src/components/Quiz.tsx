import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { buildQuiz } from '../lib/quiz';
import type { Question } from '../lib/quiz';
import { sheetVariants, spring, transition } from '../lib/motion';
import { CheckIcon, CloseIcon, TargetIcon } from './Icons';

type Props = {
  open: boolean;
  onClose: () => void;
  book: Book | null;
  books: Book[];
  onOpenVerse: (bookId: number, chapter: number) => void;
};

type Answered = { question: Question; chose: number };

/**
 * A quiz on a whole book.
 *
 * Questions are generated from the text rather than by a model, so every answer can be
 * checked against the verse it came from — and the verse is shown, with a way to open
 * it, whether the answer was right or wrong. Getting something wrong is the moment the
 * reader most wants to go and look.
 */
export function Quiz({ open, onClose, book, books, onOpenVerse }: Props) {
  const [subject, setSubject] = useState<Book | null>(book);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [at, setAt] = useState(0);
  const [chose, setChose] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setSubject(book);
  }, [open, book]);

  const begin = useCallback(async (on: Book) => {
    setLoading(true);
    setSubject(on);
    setQuestions(null);
    setAnswered([]);
    setAt(0);
    setChose(null);
    const quiz = await buildQuiz(on, 10);
    setQuestions(quiz.questions);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuestions(null);
      setAnswered([]);
      setAt(0);
      setChose(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const question = questions?.[at];
  const finished = questions !== null && at >= questions.length;
  const score = answered.filter((entry) => entry.chose === entry.question.answer).length;

  function answer(index: number) {
    if (chose !== null || !question) return;
    setChose(index);
    setAnswered((current) => [...current, { question, chose: index }]);
  }

  function onwards() {
    setChose(null);
    setAt((index) => index + 1);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(23, 20, 15, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <motion.div
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition('smooth')}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Quiz"
            style={{
              width: 'min(660px, 100%)',
              maxHeight: 'min(760px, 92vh)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-shell)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '14px 18px',
                flex: 'none',
                borderBottom: '1px solid var(--line-default)',
              }}
            >
              <span style={{ color: 'var(--text-tan)' }}>
                <TargetIcon size={18} />
              </span>
              <h2 style={{ font: '650 15px var(--font-ui)', margin: 0 }}>
                Quiz{subject && questions ? ` · ${subject.name}` : ''}
              </h2>

              {questions && !finished && (
                <span className="tabular" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {at + 1} of {questions.length}
                </span>
              )}

              <button
                onClick={onClose}
                aria-label="Close the quiz"
                style={{
                  marginLeft: 'auto',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <CloseIcon size={16} />
              </button>
            </header>

            {questions && !finished && (
              <div style={{ height: 2, background: 'var(--bg-sunken)', flex: 'none' }}>
                <motion.div
                  animate={{ width: `${(at / questions.length) * 100}%` }}
                  transition={transition('smooth')}
                  style={{ height: '100%', background: 'var(--main-fill)' }}
                />
              </div>
            )}

            <div style={{ overflowY: 'auto', padding: 20 }}>
              {loading ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
                  Reading {subject?.name}…
                </p>
              ) : !questions ? (
                <Choose books={books} suggested={book} onPick={begin} />
              ) : finished ? (
                <Score
                  score={score}
                  total={questions.length}
                  answered={answered}
                  onAgain={() => subject && begin(subject)}
                  onAnother={() => setQuestions(null)}
                  onOpenVerse={(bookId, chapter) => {
                    onOpenVerse(bookId, chapter);
                    onClose();
                  }}
                />
              ) : question ? (
                <Asking
                  question={question}
                  chose={chose}
                  onAnswer={answer}
                  onNext={onwards}
                  last={at === questions.length - 1}
                  onOpenVerse={(bookId, chapter) => {
                    onOpenVerse(bookId, chapter);
                    onClose();
                  }}
                />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Choose({
  books,
  suggested,
  onPick,
}: {
  books: Book[];
  suggested: Book | null;
  onPick: (book: Book) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Ten questions on one book, drawn from the text itself: the wording of a verse, whereabouts
        in the book a thing happens, and who is named in it.
      </p>

      {suggested && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          transition={spring.snappy}
          onClick={() => onPick(suggested)}
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-control)',
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            fontWeight: 650,
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          Quiz me on {suggested.name}
        </motion.button>
      )}

      <div>
        <div
          style={{
            font: '600 11px var(--font-ui)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}
        >
          Or another book
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {books.map((candidate) => (
            <button
              key={candidate.id}
              onClick={() => onPick(candidate)}
              style={{
                padding: '5px 10px',
                borderRadius: 7,
                border: '1px solid var(--line-default)',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              {candidate.abbreviation}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ASKING: Record<Question['kind'], string> = {
  'missing-word': 'Which word is missing?',
  'where-from': 'Whereabouts in the book is this?',
  'who-and-where': 'Who or what belongs here?',
};

function Asking({
  question,
  chose,
  onAnswer,
  onNext,
  last,
  onOpenVerse,
}: {
  question: Question;
  chose: number | null;
  onAnswer: (index: number) => void;
  onNext: () => void;
  last: boolean;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  const right = chose === question.answer;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tan)',
        }}
      >
        {ASKING[question.kind]}
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          lineHeight: 1.65,
          textWrap: 'pretty',
        }}
      >
        {question.prompt}
      </p>

      <div style={{ display: 'grid', gap: 7 }}>
        {question.options.map((option, index) => {
          const chosen = chose === index;
          const correct = index === question.answer;
          const show = chose !== null;

          return (
            <motion.button
              key={option}
              whileTap={chose === null ? { scale: 0.99 } : undefined}
              transition={spring.snappy}
              onClick={() => onAnswer(index)}
              disabled={show}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '11px 15px',
                borderRadius: 'var(--radius-control)',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 600,
                border: `1px solid ${
                  show && correct
                    ? 'var(--main-fill)'
                    : show && chosen
                      ? 'var(--text-faint)'
                      : 'var(--line-default)'
                }`,
                background: show && correct ? 'var(--bg-selected)' : 'transparent',
                opacity: show && !correct && !chosen ? 0.45 : 1,
                cursor: show ? 'default' : 'pointer',
              }}
            >
              <span style={{ flex: 1 }}>{option}</span>
              {show && correct && (
                <span style={{ color: 'var(--main-fill)' }}>
                  <CheckIcon size={16} />
                </span>
              )}
              {show && chosen && !correct && (
                <span style={{ color: 'var(--text-faint)' }}>
                  <CloseIcon size={15} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {chose !== null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition('smooth')}
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'var(--bg-sunken)',
            display: 'grid',
            gap: 9,
          }}
        >
          <div style={{ fontWeight: 650, fontSize: 13 }}>
            {right ? 'That is it.' : 'Not that one.'}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {question.note}
          </div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={onNext}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-control)',
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                fontWeight: 650,
                fontSize: 13,
              }}
            >
              {last ? 'See the score' : 'Next'}
            </motion.button>
            <button
              onClick={() => onOpenVerse(question.reference.bookId, question.reference.chapter)}
              style={{ color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600 }}
            >
              Read {question.reference.book} {question.reference.chapter}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Score({
  score,
  total,
  answered,
  onAgain,
  onAnother,
  onOpenVerse,
}: {
  score: number;
  total: number;
  answered: Answered[];
  onAgain: () => void;
  onAnother: () => void;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  const missed = answered.filter((entry) => entry.chose !== entry.question.answer);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div
          className="tabular"
          style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1 }}
        >
          {score} / {total}
        </div>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13.5 }}>
          {score === total
            ? 'Every one.'
            : missed.length === 1
              ? 'One to go back to.'
              : `${missed.length} to go back to.`}
        </p>
      </div>

      {missed.length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          {missed.map((entry, index) => (
            <button
              key={index}
              onClick={() =>
                onOpenVerse(entry.question.reference.bookId, entry.question.reference.chapter)
              }
              style={{
                padding: '10px 13px',
                borderRadius: 10,
                border: '1px solid var(--line-default)',
                textAlign: 'left',
                display: 'grid',
                gap: 3,
              }}
            >
              <span style={{ fontWeight: 650, fontSize: 12.5, color: 'var(--text-tan)' }}>
                {entry.question.reference.book} {entry.question.reference.chapter}:
                {entry.question.reference.verse}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                You said {entry.question.options[entry.chose]} · it is{' '}
                {entry.question.options[entry.question.answer]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={onAgain}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-control)',
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          Ask me again
        </motion.button>
        <button
          onClick={onAnother}
          style={{
            padding: '9px 15px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--line-default)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Another book
        </button>
      </div>
    </div>
  );
}
