import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question_text: string;
  ordre: number;
  is_blocking: boolean;
  blocking_message: string | null;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_blocking: boolean;
  blocking_message: string | null;
  ordre: number;
}

interface ConditionalDocument {
  id: string;
  option_id: string;
  nom_document: string;
  obligatoire: boolean;
}

interface ActionQuestionnaireProps {
  actionId: string;
  onAnswersChange: (answers: Record<string, string>, isBlocked: boolean, conditionalDocs: ConditionalDocument[], allAnswered: boolean, answerTexts: Record<string, string>) => void;
}

export function ActionQuestionnaire({ actionId, onAnswersChange }: ActionQuestionnaireProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [conditionalDocs, setConditionalDocs] = useState<Record<string, ConditionalDocument[]>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [actionId]);

  useEffect(() => {
    // Check for blocking answers and collect conditional documents
    let isBlocked = false;
    let blockedMessage: string | null = null;
    const collectedDocs: ConditionalDocument[] = [];
    const answerTexts: Record<string, string> = {};

    Object.entries(answers).forEach(([questionId, optionId]) => {
      const questionOptions = options[questionId];
      if (questionOptions) {
        const selectedOption = questionOptions.find(o => o.id === optionId);
        if (selectedOption) {
          // Stocker le texte de l'option sélectionnée
          answerTexts[questionId] = selectedOption.option_text;
          
          if (selectedOption.is_blocking) {
            isBlocked = true;
            blockedMessage = selectedOption.blocking_message || "Cette option bloque la démarche";
          }
          // Collect conditional documents for this option
          const docs = conditionalDocs[optionId];
          if (docs) {
            collectedDocs.push(...docs);
          }
        }
      }
    });

    setBlockingMessage(blockedMessage);
    
    // Vérifier si toutes les questions ont une réponse
    const allQuestionsAnswered = questions.length > 0 && questions.every(q => answers[q.id]);
    
    onAnswersChange(answers, isBlocked, collectedDocs, allQuestionsAnswered, answerTexts);
  }, [answers, options, conditionalDocs, questions]);

  const loadQuestions = async () => {
    setLoading(true);

    // Load questions for this action
    const { data: questionsData } = await supabase
      .from('action_questions')
      .select('*')
      .eq('action_id', actionId)
      .order('ordre');

    if (questionsData && questionsData.length > 0) {
      setQuestions(questionsData);

      // Load options for all questions
      const questionIds = questionsData.map(q => q.id);
      const { data: optionsData } = await supabase
        .from('action_question_options')
        .select('*')
        .in('question_id', questionIds)
        .order('ordre');

      if (optionsData) {
        const optionsByQuestion: Record<string, Option[]> = {};
        optionsData.forEach(opt => {
          if (!optionsByQuestion[opt.question_id]) {
            optionsByQuestion[opt.question_id] = [];
          }
          optionsByQuestion[opt.question_id].push(opt);
        });
        setOptions(optionsByQuestion);

        // Load conditional documents for all options
        const optionIds = optionsData.map(o => o.id);
        const { data: docsData } = await supabase
          .from('action_conditional_documents')
          .select('*')
          .in('option_id', optionIds);

        if (docsData) {
          const docsByOption: Record<string, ConditionalDocument[]> = {};
          docsData.forEach(doc => {
            if (!docsByOption[doc.option_id]) {
              docsByOption[doc.option_id] = [];
            }
            docsByOption[doc.option_id].push(doc);
          });
          setConditionalDocs(docsByOption);
        }
      }
    }

    setLoading(false);
  };

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  const allQuestionsAnswered = questions.every(q => answers[q.id]);

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Questions préalables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {blockingMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Démarche impossible</AlertTitle>
            <AlertDescription>{blockingMessage}</AlertDescription>
          </Alert>
        )}

        {questions.map((question, idx) => (
          <div key={question.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
              <Label className="text-sm font-medium">{question.question_text}</Label>
            </div>
            
            <RadioGroup
              value={answers[question.id] || ""}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="grid gap-2 pl-8"
            >
              {options[question.id]?.map((option) => {
                const isSelected = answers[question.id] === option.id;
                const hasConditionalDocs = conditionalDocs[option.id]?.length > 0;
                
                return (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={option.id} 
                        id={option.id}
                        className={option.is_blocking ? "border-destructive" : ""}
                      />
                      <Label 
                        htmlFor={option.id} 
                        className={`text-sm cursor-pointer ${option.is_blocking ? "text-destructive" : ""}`}
                      >
                        {option.option_text}
                        {option.is_blocking && (
                          <span className="ml-2 text-xs text-destructive">(bloquant)</span>
                        )}
                      </Label>
                    </div>
                    
                    {isSelected && hasConditionalDocs && (
                      <div className="ml-6 mt-2 p-2 bg-muted rounded-md text-xs">
                        <p className="font-medium text-muted-foreground mb-1">Documents additionnels requis :</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {conditionalDocs[option.id]?.map(doc => (
                            <li key={doc.id} className={doc.obligatoire ? "text-foreground" : "text-muted-foreground"}>
                              {doc.nom_document}
                              {doc.obligatoire && <span className="text-destructive font-bold ml-1">*</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        ))}

        {allQuestionsAnswered && !blockingMessage && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">Questionnaire complété</AlertTitle>
            <AlertDescription className="text-green-600">
              Vous pouvez continuer avec le téléchargement des documents.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
