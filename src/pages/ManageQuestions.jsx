import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react'

export default function ManageQuestions() {
  const { id } = useParams()
  const { user } = useAuth()
  const [block, setBlock] = useState(null)
  const [questions, setQuestions] = useState([])
  const [corrections, setCorrections] = useState(new Map())
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [id, user])

  const loadData = async () => {
    try {
      // Cargar bloque
      const { data: blockData, error: blockError } = await supabase
        .from('exam_blocks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (blockError) throw blockError
      setBlock(blockData)

      // Cargar preguntas
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_block_id', id)
        .order('question_number', { ascending: true })

      if (questionsError) throw questionsError
      setQuestions(questionsData)

      // Cargar correcciones
      const questionIds = questionsData.map(q => q.id)
      const { data: correctionsData } = await supabase
        .from('question_corrections')
        .select('*')
        .in('question_id', questionIds)
        .eq('user_id', user.id)

      const correctionsMap = new Map(
        correctionsData?.map(c => [c.question_id, c]) || []
      )
      setCorrections(correctionsMap)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditQuestion = (question) => {
    const correction = corrections.get(question.id)
    setEditingQuestion(question.id)
    setNewCorrectAnswer(correction?.corrected_answer || question.correct_answer)
    setCorrectionReason(correction?.reason || '')
  }

  const handleSaveCorrection = async () => {
    if (!newCorrectAnswer) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('question_corrections')
        .upsert({
          question_id: editingQuestion,
          user_id: user.id,
          corrected_answer: newCorrectAnswer,
          reason: correctionReason || null
        })

      if (error) throw error

      await loadData()
      setEditingQuestion(null)
      setNewCorrectAnswer('')
      setCorrectionReason('')
    } catch (error) {
      console.error('Error saving correction:', error)
      alert('Error al guardar la corrección')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingQuestion(null)
    setNewCorrectAnswer('')
    setCorrectionReason('')
  }

  const handleDeleteCorrection = async (questionId) => {
    if (!confirm('¿Eliminar esta corrección y volver a la respuesta original?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('question_corrections')
        .delete()
        .eq('question_id', questionId)
        .eq('user_id', user.id)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error deleting correction:', error)
      alert('Error al eliminar la corrección')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!block) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Bloque no encontrado</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to={`/blocks/${id}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver al bloque
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{block.name}</h1>
        <p className="text-gray-600">Gestiona y corrige las respuestas correctas de las preguntas</p>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">💡 ¿Para qué sirve esto?</p>
              <p>
                Si encuentras una pregunta con la respuesta correcta equivocada, puedes corregirla aquí.
                Tus correcciones se aplicarán a todos tus futuros intentos de este bloque.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const correction = corrections.get(question.id)
          const isEditing = editingQuestion === question.id
          const effectiveCorrectAnswer = correction?.corrected_answer || question.correct_answer

          return (
            <div key={question.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full mb-3">
                    Pregunta #{question.question_number}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {question.question_text}
                  </h3>
                </div>
                
                {!isEditing && (
                  <button
                    onClick={() => handleEditQuestion(question)}
                    className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                )}
              </div>

              {/* Opciones */}
              <div className="space-y-2 mb-4">
                {Object.entries(question.options).map(([key, value]) => {
                  const isCorrect = key === effectiveCorrectAnswer

                  return (
                    <div
                      key={key}
                      className={`p-3 rounded border-2 ${
                        isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="font-semibold mr-2">{key}.</span>
                      <span>{value}</span>
                      {isCorrect && (
                        <span className="ml-2 text-sm font-medium text-green-600">
                          ✓ Respuesta correcta
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Estado de corrección */}
              {correction && !isEditing && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">
                        ⚠️ Respuesta corregida por ti: {correction.corrected_answer}
                      </p>
                      {correction.reason && (
                        <p className="text-sm text-yellow-700 mt-1">
                          Motivo: {correction.reason}
                        </p>
                      )}
                      <p className="text-xs text-yellow-600 mt-1">
                        Original era: {question.correct_answer}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCorrection(question.id)}
                      className="ml-2 text-yellow-600 hover:text-yellow-700"
                      title="Eliminar corrección"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario de edición */}
              {isEditing && (
                <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-300">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selecciona la respuesta correcta:
                  </p>
                  <select
                    value={newCorrectAnswer}
                    onChange={(e) => setNewCorrectAnswer(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mb-3"
                  >
                    {Object.keys(question.options).map((key) => (
                      <option key={key} value={key}>
                        {key} - {question.options[key]}
                      </option>
                    ))}
                  </select>

                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Motivo de la corrección (opcional):
                  </p>
                  <textarea
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Ej: La respuesta oficial está incorrecta según la documentación..."
                    className="w-full p-2 border border-gray-300 rounded mb-3"
                    rows={2}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCorrection}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Guardando...' : 'Guardar corrección'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
