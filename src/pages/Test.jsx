import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Pause, ArrowRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function Test() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([]) // Array de respuestas
  const [feedback, setFeedback] = useState(null)
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTestData()
  }, [attemptId, user])

  const loadTestData = async () => {
    try {
      // Cargar intento
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exam_blocks(*)
        `)
        .eq('id', attemptId)
        .eq('user_id', user.id)
        .single()

      if (attemptError) throw attemptError
      setAttempt(attemptData)
      setCurrentQuestionIndex(attemptData.current_question_index)

      // Cargar preguntas del bloque
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_block_id', attemptData.exam_block_id)
        .order('question_number', { ascending: true })

      if (questionsError) throw questionsError
      setQuestions(questionsData)

      // Cargar respuestas ya dadas
      const { data: answersData } = await supabase
        .from('user_answers')
        .select('question_id')
        .eq('attempt_id', attemptId)

      if (answersData) {
        setAnsweredQuestions(new Set(answersData.map(a => a.question_id)))
      }
    } catch (error) {
      console.error('Error loading test:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCorrectAnswer = async (questionId) => {
    // Primero buscar si hay corrección del usuario
    const { data: correction } = await supabase
      .from('question_corrections')
      .select('corrected_answer')
      .eq('question_id', questionId)
      .eq('user_id', user.id)
      .single()

    if (correction) {
      return correction.corrected_answer
    }

    // Si no hay corrección, usar la respuesta original
    const question = questions.find(q => q.id === questionId)
    return question?.correct_answer
  }

  // Normalizar respuesta (ordenar alfabéticamente)
  const normalizeAnswer = (answer) => {
    if (!answer) return ''
    return answer.split(',').map(a => a.trim()).sort().join(',')
  }

  const handleAnswerToggle = (answer) => {
    if (feedback) return // Ya respondió esta pregunta

    setSelectedAnswers(prev => {
      if (prev.includes(answer)) {
        // Quitar respuesta
        return prev.filter(a => a !== answer)
      } else {
        // Añadir respuesta
        return [...prev, answer].sort()
      }
    })
  }
  const handleSubmitAnswer = async () => {
    if (selectedAnswers.length === 0) return
    
    const currentQuestion = questions[currentQuestionIndex]
    const correctAnswer = await getCorrectAnswer(currentQuestion.id)
    const userAnswer = normalizeAnswer(selectedAnswers.join(','))
    const normalizedCorrect = normalizeAnswer(correctAnswer)
    const isCorrect = userAnswer === normalizedCorrect

    // Guardar respuesta
    const { error } = await supabase
      .from('user_answers')
      .insert({
        attempt_id: attemptId,
        question_id: currentQuestion.id,
        selected_answer: userAnswer,
        is_correct: isCorrect
      })

    if (error) {
      console.error('Error saving answer:', error)
      return
    }

    // Actualizar estadísticas diarias
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: existingStat } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (existingStat) {
      await supabase
        .from('daily_stats')
        .update({
          questions_answered: existingStat.questions_answered + 1,
          questions_correct: existingStat.questions_correct + (isCorrect ? 1 : 0)
        })
        .eq('id', existingStat.id)
    } else {
      await supabase
        .from('daily_stats')
        .insert({
          user_id: user.id,
          date: today,
          questions_answered: 1,
          questions_correct: isCorrect ? 1 : 0
        })
    }

    // Mostrar feedback
    setFeedback({
      isCorrect,
      correctAnswer: normalizedCorrect
    })

    // Marcar pregunta como respondida
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]))
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      setSelectedAnswers([])
      setFeedback(null)

      // Actualizar índice en el intento
      await supabase
        .from('exam_attempts')
        .update({ current_question_index: nextIndex })
        .eq('id', attemptId)
    } else {
      // Finalizar test
      await completeTest()
    }
  }

  const completeTest = async () => {
    // Calcular puntuación
    const { data: answers } = await supabase
      .from('user_answers')
      .select('is_correct')
      .eq('attempt_id', attemptId)

    const score = answers?.filter(a => a.is_correct).length || 0

    // Actualizar intento
    await supabase
      .from('exam_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score
      })
      .eq('id', attemptId)

    navigate(`/test/${attemptId}/results`)
  }

  const handlePauseTest = async () => {
    await supabase
      .from('exam_attempts')
      .update({ status: 'paused' })
      .eq('id', attemptId)

    navigate(`/blocks/${attempt.exam_block_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!attempt || questions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Error cargando el test</p>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {attempt.exam_blocks.name}
          </h1>
          <button
            onClick={handlePauseTest}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pausar
          </button>
        </div>
        
        {/* Barra de progreso */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pregunta */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-4">
            Pregunta #{currentQuestion.question_number}
          </span>
          <h2 className="text-xl font-semibold text-gray-900">
            {currentQuestion.question_text}
          </h2>
        </div>

        {/* Opciones */}
        <div className="space-y-3">
          {Object.entries(currentQuestion.options).map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key)
            const correctAnswers = feedback ? feedback.correctAnswer.split(',').map(a => a.trim()) : []
            const isCorrectAnswer = feedback && correctAnswers.includes(key)
            const isWrongAnswer = feedback && isSelected && !correctAnswers.includes(key)

            let buttonClass = 'w-full text-left p-4 border-2 rounded-lg transition-all '
            
            if (feedback) {
              if (isCorrectAnswer) {
                buttonClass += 'border-green-500 bg-green-50'
              } else if (isWrongAnswer) {
                buttonClass += 'border-red-500 bg-red-50'
              } else {
                buttonClass += 'border-gray-200 opacity-50'
              }
            } else {
              buttonClass += isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }

            return (
              <button
                key={key}
                onClick={() => handleAnswerToggle(key)}
                disabled={feedback !== null}
                className={buttonClass}
              >
                <div className="flex items-start">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-semibold mr-3">
                    {key}
                  </span>
                  <span className="flex-1 text-gray-900">{value}</span>
                  {!feedback && isSelected && (
                    <CheckCircle className="flex-shrink-0 w-6 h-6 text-blue-600 ml-2" />
                  )}
                  {feedback && isCorrectAnswer && (
                    <CheckCircle className="flex-shrink-0 w-6 h-6 text-green-600 ml-2" />
                  )}
                  {feedback && isWrongAnswer && (
                    <XCircle className="flex-shrink-0 w-6 h-6 text-red-600 ml-2" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Botón de enviar respuesta */}
        {!feedback && selectedAnswers.length > 0 && (
          <button
            onClick={handleSubmitAnswer}
            className="mt-4 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Enviar respuesta{selectedAnswers.length > 1 ? 's' : ''}
          </button>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`mt-6 p-4 rounded-lg ${feedback.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center">
              {feedback.isCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">¡Correcto!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-900">
                    Incorrecto. La respuesta correcta es: {feedback.correctAnswer}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón siguiente */}
      {feedback && (
        <button
          onClick={handleNextQuestion}
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          {currentQuestionIndex < questions.length - 1 ? (
            <>
              Siguiente pregunta
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            'Finalizar test'
          )}
        </button>
      )}
    </div>
  )
}
