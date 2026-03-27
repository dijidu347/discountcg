import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isAcceptedFileType, isFileTooLarge } from "@/lib/coffre-compression";

const PAGE_SIZE = 20;

export interface CoffreDocument {
  id: string;
  garage_id: string;
  category: string;
  title: string;
  amount: number | null;
  document_date: string;
  note: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

interface DocumentFilters {
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCoffreDocuments(filters: DocumentFilters = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const documentsQuery = useInfiniteQuery({
    queryKey: ["coffre-documents", user?.id, filters],
    queryFn: async ({ pageParam = 0 }): Promise<CoffreDocument[]> => {
      let query = supabase
        .from("coffre_documents" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte("document_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("document_date", filters.dateTo);
      }
      if (filters.search) {
        const sanitized = filters.search.replace(/[%_,.()"']/g, "");
        if (sanitized) {
          query = query.or(`title.ilike.%${sanitized}%,note.ilike.%${sanitized}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as CoffreDocument[]) || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });

  const uploadDocument = useMutation({
    mutationFn: async (params: {
      file: File;
      category: string;
      title: string;
      documentDate: string;
      amount?: number;
      note?: string;
      garageId: string;
    }) => {
      // File is already compressed by DocumentUploadWizard
      const file = params.file;

      // Generate storage path
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileId = crypto.randomUUID();
      const filePath = `${params.garageId}/${fileId}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("coffre-fort-documents")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert document record — cleanup storage on failure
      const { data, error: insertError } = await supabase
        .from("coffre_documents" as any)
        .insert({
          garage_id: params.garageId,
          category: params.category,
          title: params.title,
          document_date: params.documentDate,
          amount: params.amount ?? null,
          note: params.note || null,
          file_path: filePath,
          file_name: params.file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup orphaned storage file
        await supabase.storage.from("coffre-fort-documents").remove([filePath]);
        throw insertError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffre-documents"] });
      toast.success("Document enregistré !");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi du document");
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: CoffreDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("coffre-fort-documents")
        .remove([doc.file_path]);

      if (storageError) console.error("Storage delete error:", storageError);

      // Delete from DB
      const { error: dbError } = await supabase
        .from("coffre_documents" as any)
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffre-documents"] });
      toast.success("Document supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const updateDocument = useMutation({
    mutationFn: async (params: { id: string; title?: string; note?: string; amount?: number | null }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("coffre_documents" as any)
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffre-documents"] });
      toast.success("Document mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const allDocuments = documentsQuery.data?.pages.flat() || [];

  return {
    documents: allDocuments,
    isLoading: documentsQuery.isLoading,
    fetchNextPage: documentsQuery.fetchNextPage,
    hasNextPage: documentsQuery.hasNextPage,
    isFetchingNextPage: documentsQuery.isFetchingNextPage,
    uploadDocument,
    deleteDocument,
    updateDocument,
    totalCount: allDocuments.length,
  };
}
