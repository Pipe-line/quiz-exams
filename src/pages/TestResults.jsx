import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, ArrowLeft, Edit } from 'lucide-react'

export default function TestResults() {
  const { attemptId } = useParams()
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [correctingQuestion, setCorrectingQuestion] = useState(null)
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')

  useEffect(() => {
    loadResults()
  }, [attemptId, user])

  const loadResults = async () => {
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

      // Cargar respuestas con preguntas
      const { data: answersData, error: answersError } = await supabase
        .from('user_answers')
        .select(`
          *,
          questions(*)
        `)
        .eq('attempt_id', attemptId)
        .order('answered_at', { ascending: true })

      if (answersError) throw answersError

      // Cargar correcciones
      const questionIds = answersData.map(a => a.question_id)
      const { data: corrections } = await supabase
        .from('question_corrections')
        .select('*')
        .in('question_id', questionIds)
        .eq('user_id', user.id)

      const correctionsMap = new Map(
        corrections?.map(c => [c.question_id, c]) || []
      )

      // Combinar datos
      const resultsWithCorrections = answersData.map(answer => ({
        ...answer,
        correction: correctionsMap.get(answer.question_id)
      }))

      setResults(resultsWithCorrections)
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCorrectAnswer = async (questionId, currentCorrectAnswer) => {
    setCorrectingQuestion(questionId)
    setNewCorrectAnswer(currentCorrectAnswer)
    setCorrectionReason('')
  }

  const handleSaveCorrection = async () => {
    if (!newCorrectAnswer) return

    try {
      const { error } = await supabase
        .from('question_corrections')
        .upsert({
          question_id: correctingQuestion,
          user_id: user.id,
          corrected_answer: newCorrectAnswer,
          reason: correctionReason || null
        })

      if (error) throw error

      await loadResults()
      setCorrectingQuestion(null)
      setNewCorrectAnswer('')
      setCorrectionReason('')
    } catch (error) {
      console.error('Error saving correction:', error)
      alert('Error al guardar la corrección')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Resultados no encontrados</p>
      </div>
    )
  }

  const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
  const correctAnswers = results.filter(r => r.is_correct).length
  const incorrectAnswers = results.length - correctAnswers

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to={`/blocks/${attempt.exam_block_id}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver al bloque
      </Link>

      {/* Resumen */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Resultados del Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <p className="text-sm text-blue-600 font-medium mb-2">Puntuación</p>
            <p className="text-4xl font-bold text-blue-900">
              {attempt.score}/{attempt.total_questions}
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <p className="text-sm text-green-600 font-medium mb-2">Correctas</p>
            <p className="text-4xl font-bold text-green-900">{correctAnswers}</p>
          </div>
          
          <div className="bg-red-50 rounded-lg p-6 text-center">
            <p className="text-sm text-red-600 font-medium mb-2">Incorrectas</p>
            <p className="text-4xl font-bold text-red-900">{incorrectAnswers}</p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-2">Porcentaje de acierto</p>
            <div className={`text-5xl font-bold ${
              percentage >= 70 ? 'text-green-600' : 
              percentage >= 50 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {percentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de respuestas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Detalle de respuestas</h2>
        
        <div className="space-y-6">
          {results.map((result, index) => {
            const question = result.questions
            const effectiveCorrectAnswer = result.correction?.corrected_answer || question.correct_answer
            const isEditing = correctingQuestion === question.id

            return (
              <div
                key={result.id}
                className={`p-6 rounded-lg border-2 ${
                  result.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start flex-1">
                    {result.is_correct ? (
                      <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-2">Pregunta #{question.question_number}</p>
                      <p className="text-lg font-medium text-gray-900 mb-3">{question.question_text}</p>
                      
                      <div className="space-y-2 mb-3">
                        {Object.entries(question.options).map(([key, value]) => {
                          const userAnswers = result.selected_answer.split(',').map(a => a.trim())
                          const correctAnswers = effectiveCorrectAnswer.split(',').map(a => a.trim())
                          const isUserAnswer = userAnswers.includes(key)
                          const isCorrect = correctAnswers.includes(key)

                          return (
                            <div
                              key={key}
                              className={`p-3 rounded ${
                                isCorrect ? 'bg-green-100 border border-green-300' :
                                isUserAnswer && !isCorrect ? 'bg-red-100 border border-red-300' :
                                'bg-white border border-gray-200'
                              }`}
                            >
                              <span className="font-semibold mr-2">{key}.</span>
                              <span>{value}</span>
                              {isUserAnswer && (
                                <span className="ml-2 text-sm font-medium text-gray-600">(Tu respuesta)</span>
                              )}
                              {isCorrect && (
                                <span className="ml-2 text-sm font-medium text-green-600">(Correcta)</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {result.correction && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm font-medium text-yellow-900">
                            ⚠️ Respuesta corregida por ti: {result.correction.corrected_answer}
                          </p>
                          {result.correction.reason && (
                            <p className="text-sm text-yellow-700 mt-1">
                              Motivo: {result.correction.reason}
                            </p>
                          )}
                        </div>
                      )}

                      {isEditing && (
                        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-300">
                          <p className="text-sm font-medium text-gray-700 mb-2">Corregir respuesta correcta:</p>
                          <select
                            value={newCorrectAnswer}
                            onChange={(e) => setNewCorrectAnswer(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-3"
                          >
                            {Object.keys(question.options).map(key => (
                              <option key={key} value={key}>
                                {key} - {question.options[key]}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={correctionReason}
                            onChange={(e) => setCorrectionReason(e.target.value)}
                            placeholder="Motivo de la corrección (opcional)"
                            className="w-full p-2 border border-gray-300 rounded mb-3"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveCorrection}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Guardar corrección
                            </button>
                            <button
                              onClick={() => setCorrectingQuestion(null)}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!result.is_correct && !isEditing && (
                    <button
                      onClick={() => handleCorrectAnswer(question.id, effectiveCorrectAnswer)}
                      className="ml-4 inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Marcar otra respuesta como correcta"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
