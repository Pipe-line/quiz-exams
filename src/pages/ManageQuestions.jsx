import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Edit, Save, X, AlertCircle, Check } from 'lucide-react'

export default function ManageQuestions() {
  const { id } = useParams()
  const { user } = useAuth()
  const [block, setBlock] = useState(null)
  const [questions, setQuestions] = useState([])
  const [corrections, setCorrections] = useState(new Map())
  const [editMode, setEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(new Map()) // {questionId: {answer, reason}}
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

  const handleOptionClick = (questionId, optionKey) => {
    if (!editMode) return

    const question = questions.find(q => q.id === questionId)
    const correction = corrections.get(questionId)
    const currentCorrectAnswer = correction?.corrected_answer || question.correct_answer
    const currentAnswers = currentCorrectAnswer.split(',').map(a => a.trim())

    let newAnswers
    if (currentAnswers.includes(optionKey)) {
      // Quitar esta opción
      newAnswers = currentAnswers.filter(a => a !== optionKey)
    } else {
      // Añadir esta opción
      newAnswers = [...currentAnswers, optionKey].sort()
    }

    // Si no queda ninguna respuesta, usar 'A' por defecto
    if (newAnswers.length === 0) {
      newAnswers = ['A']
    }

    // Guardar cambio pendiente
    setPendingChanges(prev => new Map(prev).set(questionId, {
      answer: newAnswers.join(','),
      reason: prev.get(questionId)?.reason || ''
    }))
  }

  const handleReasonChange = (questionId, reason) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(questionId)
      if (existing) {
        newMap.set(questionId, { ...existing, reason })
      }
      return newMap
    })
  }

  const handleRemovePendingChange = (questionId) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev)
      newMap.delete(questionId)
      return newMap
    })
  }

  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) {
      setEditMode(false)
      return
    }

    setSaving(true)
    try {
      const updates = Array.from(pendingChanges.entries()).map(([questionId, change]) => ({
        question_id: questionId,
        user_id: user.id,
        corrected_answer: change.answer,
        reason: change.reason || null
      }))

      const { error } = await supabase
        .from('question_corrections')
        .upsert(updates)

      if (error) throw error

      await loadData()
      setPendingChanges(new Map())
      setEditMode(false)
    } catch (error) {
      console.error('Error saving corrections:', error)
      alert('Error al guardar las correcciones')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelAll = () => {
    setPendingChanges(new Map())
    setEditMode(false)
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
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{block.name}</h1>
            <p className="text-gray-600">Gestiona y corrige las respuestas correctas de las preguntas</p>
          </div>
          
          {/* Botón de edición global */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-5 h-5 mr-2" />
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Guardando...' : `Guardar${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
              </button>
              <button
                onClick={handleCancelAll}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="w-5 h-5 mr-2" />
                Cancelar
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">💡 ¿Cómo funciona?</p>
              <p>
                {editMode ? (
                  <>Haz <strong>click en la opción correcta</strong> de cada pregunta. Los cambios se guardarán al pulsar "Guardar".</>
                ) : (
                  <>Pulsa <strong>"Editar"</strong> para activar el modo de corrección.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((question) => {
          const correction = corrections.get(question.id)
          const pendingChange = pendingChanges.get(question.id)
          const effectiveCorrectAnswer = pendingChange?.answer || correction?.corrected_answer || question.correct_answer

          return (
            <div key={question.id} className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full mb-3">
                  Pregunta #{question.question_number}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {question.question_text}
                </h3>
              </div>

              {/* Opciones */}
              <div className="space-y-2 mb-4">
                {Object.entries(question.options).map(([key, value]) => {
                  const correctAnswers = effectiveCorrectAnswer.split(',').map(a => a.trim())
                  const isCorrect = correctAnswers.includes(key)
                  const isClickable = editMode

                  return (
                    <button
                      key={key}
                      onClick={() => handleOptionClick(question.id, key)}
                      disabled={!isClickable}
                      className={`w-full text-left p-3 rounded border-2 transition-all ${
                        isCorrect
                          ? 'border-green-500 bg-green-50'
                          : isClickable
                          ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-semibold mr-2">{key}.</span>
                          <span>{value}</span>
                        </div>
                        {isCorrect && (
                          <Check className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Cambio pendiente */}
              {pendingChange && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-medium text-blue-900">
                      ✏️ Cambio pendiente: {pendingChange.answer}
                      {correction && ` (antes: ${correction.corrected_answer || question.correct_answer})`}
                    </p>
                    <button
                      onClick={() => handleRemovePendingChange(question.id)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Deshacer cambio"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={pendingChange.reason}
                    onChange={(e) => handleReasonChange(question.id, e.target.value)}
                    placeholder="Motivo del cambio (opcional)..."
                    className="w-full p-2 border border-blue-300 rounded text-sm"
                    rows={2}
                  />
                </div>
              )}

              {/* Estado de corrección existente */}
              {correction && !pendingChange && !editMode && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">
                        ⚠️ Respuesta corregida: {correction.corrected_answer}
                      </p>
                      {correction.reason && (
                        <p className="text-sm text-yellow-700 mt-1">
                          Motivo: {correction.reason}
                        </p>
                      )}
                      <p className="text-xs text-yellow-600 mt-1">
                        Original: {question.correct_answer}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
