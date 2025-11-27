import { supabase } from "@/utils/supabase";
import { Database } from "@/types/supabase";

type Post = Database['public']['Tables']['posts']['Row'];
type PostAuthor = Database['public']['Tables']['post_authors']['Row'];

export type CollaborativeProject = Post & {
  post_authors: (PostAuthor & {
    profiles: Database['public']['Tables']['profiles']['Row'] | null;
  })[];
};

export async function createCollaborativeProject(
  title: string,
  creatorId: string,
  collaboratorIds: string[]
): Promise<CollaborativeProject | null> {
  try {
    const { data: project, error: projectError } = await supabase
      .from('posts')
      .insert({
        title: title.trim(),
        user_id: creatorId,
        track_count: 0,
        _url: ''
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error('Error creating project:', projectError);
      return null;
    }

    const allCollaborators = [creatorId, ...collaboratorIds];
    const authorEntries = allCollaborators.map(userId => ({
      post_id: project.id,
      user_id: userId
    }));

    const { error: authorsError } = await supabase
      .from('post_authors')
      .insert(authorEntries);

    if (authorsError) {
      console.error('Error adding collaborators:', authorsError);
      await supabase.from('posts').delete().eq('id', project.id);
      return null;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allCollaborators);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return {
      ...project,
      post_authors: authorEntries.map(entry => ({
        ...entry,
        id: '',
        created_at: new Date().toISOString(),
        profiles: profileMap.get(entry.user_id) || null
      }))
    } as CollaborativeProject;
  } catch (error) {
    console.error('Error in createCollaborativeProject:', error);
    return null;
  }
}

export async function getProject(projectId: string): Promise<CollaborativeProject | null> {
  try {
    const { data: project, error: projectError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return null;
    }

    const { data: authors } = await supabase
      .from('post_authors')
      .select('*')
      .eq('post_id', projectId);

    if (!authors || authors.length === 0) {
      return null;
    }

    const userIds = authors.map(a => a.user_id).filter((id): id is string => typeof id === 'string');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    return {
      ...project,
      post_authors: authors.map(author => ({
        ...author,
        profiles: author.user_id ? profileMap.get(author.user_id) || null : null
      }))
    } as CollaborativeProject;
  } catch (error) {
    console.error('Error in getProject:', error);
    return null;
  }
}

export async function addCollaborator(
  projectId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('post_authors')
      .select('id')
      .eq('post_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return true;
    }

    const { error } = await supabase
      .from('post_authors')
      .insert({
        post_id: projectId,
        user_id: userId
      });

    if (error) {
      console.error('Error adding collaborator:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return false;
  }
}

export async function removeCollaborator(
  projectId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_authors')
      .delete()
      .eq('post_id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing collaborator:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeCollaborator:', error);
    return false;
  }
}

export async function isUserCollaborator(
  projectId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('post_authors')
      .select('id')
      .eq('post_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking collaborator status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isUserCollaborator:', error);
    return false;
  }
}

export async function getUserProjects(userId: string): Promise<CollaborativeProject[]> {
  try {
    const { data: authorships } = await supabase
      .from('post_authors')
      .select('post_id')
      .eq('user_id', userId);

    if (!authorships || authorships.length === 0) {
      return [];
    }

    const projectIds = authorships.map(a => a.post_id).filter((id): id is string => typeof id === 'string');

    const { data: projects } = await supabase
      .from('posts')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (!projects) {
      return [];
    }

    const { data: allAuthors } = await supabase
      .from('post_authors')
      .select('*')
      .in('post_id', projectIds);

    const allUserIds = [...new Set(allAuthors?.map(a => a.user_id).filter((id): id is string => typeof id === 'string') || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const authorsByProject = new Map<string, typeof allAuthors>();

    allAuthors?.forEach(author => {
      if (author.post_id) {
        if (!authorsByProject.has(author.post_id)) {
          authorsByProject.set(author.post_id, []);
        }
        authorsByProject.get(author.post_id)?.push(author);
      }
    });

    return projects.map(project => ({
      ...project,
      post_authors: (authorsByProject.get(project.id) || []).map(author => ({
        ...author,
        profiles: author.user_id ? profileMap.get(author.user_id) || null : null
      }))
    })) as CollaborativeProject[];
  } catch (error) {
    console.error('Error in getUserProjects:', error);
    return [];
  }
}