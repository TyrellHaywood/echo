'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Check, Upload } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';
import { mixTracks } from '@/utils/mixTracks';
import { toast } from 'sonner';

interface Track {
  id: string;
  audio_url: string;
  volume: number;
  pan: number;
  is_muted: boolean;
  duration: number;
}

interface PublishDialogProps {
  projectId: string;
  tracks: Track[];
  projectTitle?: string;
}

interface PostData {
  title: string;
  description: string;
  types: string[];
}

export default function PublishDialog({
  projectId,
  tracks,
  projectTitle,
}: PublishDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mixing, setMixing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [mixedAudioBlob, setMixedAudioBlob] = useState<Blob | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [currentType, setCurrentType] = useState('');
  
  const [postData, setPostData] = useState<PostData>({
    title: projectTitle || 'Untitled Project',
    description: '',
    types: [],
  });

  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { header: 'Mix Audio', subHeader: 'Combine all tracks into one file' },
    { header: 'Cover Image', subHeader: 'Choose a cover for your post' },
    { header: 'Details', subHeader: 'Add title, description, and tags' },
    { header: 'Preview', subHeader: 'Review before publishing' },
  ];

  const currentSetup = steps[currentStep];

  const handleInputChange = (field: keyof PostData, value: string) => {
    setPostData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addType = () => {
    if (currentType.trim() && !postData.types.includes(currentType.trim())) {
      setPostData((prev) => ({
        ...prev,
        types: [...prev.types, currentType.trim()],
      }));
      setCurrentType('');
    }
  };

  const removeType = (type: string) => {
    setPostData((prev) => ({
      ...prev,
      types: prev.types.filter((t) => t !== type),
    }));
  };

  const handleMixAudio = async () => {
    setMixing(true);
    setError('');
    
    try {
      const mixedBlob = await mixTracks(tracks);
      setMixedAudioBlob(mixedBlob);
      toast.success('Tracks mixed successfully!');
      setCurrentStep(1);
    } catch (err: any) {
      console.error('Error mixing tracks:', err);
      setError(err.message || 'Failed to mix audio tracks');
      toast.error('Failed to mix audio tracks');
    } finally {
      setMixing(false);
    }
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    
    try {
      setCoverFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handlePublish = async () => {
    if (!mixedAudioBlob) {
      setError('Audio must be mixed first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      setUploading(true);

      // Upload mixed audio
      const audioFileName = `${user.id}/${Date.now()}_mixed.wav`;
      const { error: audioUploadError } = await supabase.storage
        .from('audio')
        .upload(audioFileName, mixedAudioBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (audioUploadError) throw audioUploadError;

      const {
        data: { publicUrl: audioPublicUrl },
      } = supabase.storage.from('audio').getPublicUrl(audioFileName);

      // Upload cover image if provided
      let coverUrl = '';
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverFileName = `${user.id}/${Date.now()}_cover.${coverExt}`;

        const { error: coverUploadError } = await supabase.storage
          .from('covers')
          .upload(coverFileName, coverFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (coverUploadError) throw coverUploadError;

        const {
          data: { publicUrl: coverPublicUrl },
        } = supabase.storage.from('covers').getPublicUrl(coverFileName);

        coverUrl = coverPublicUrl;
      }

      setUploading(false);

      // Update the project post with the mixed audio and metadata
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          _url: audioPublicUrl,
          title: postData.title,
          description: postData.description || null,
          types: postData.types.length > 0 ? postData.types : null,
          cover_image_url: coverUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('Project published successfully!');
      
      // Navigate to the published post
      router.push(`/post/${projectId}`);
      setOpen(false);
    } catch (error: any) {
      console.error('Publishing error:', error);
      setError(error.message);
      toast.error('Failed to publish project');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      handleMixAudio();
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Mix Audio
        return (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-muted/50 rounded-md">
              <p className="text-muted-foreground">
                Mix all {tracks.filter(t => !t.is_muted).length} active tracks into a single audio file
              </p>
              {tracks.filter(t => t.is_muted).length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {tracks.filter(t => t.is_muted).length} muted track(s) will be excluded
                </p>
              )}
            </div>
            {mixedAudioBlob && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check size={20} />
                <span>Audio mixed successfully</span>
              </div>
            )}
          </div>
        );

      case 1: // Cover Image
        return (
          <div className="space-y-4">
            {coverPreview && (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  width={200}
                  height={200}
                  className="rounded-md object-cover w-full max-w-64 max-h-64"
                />
                <span className="flex flex-row items-center gap-1 text-green-600">
                  <Check size={16} /> Selected
                </span>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="file:rounded-sm file:bg-muted hover:file:bg-muted/70"
            />
          </div>
        );

      case 2: // Details
        return (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Project title"
              value={postData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
            <Textarea
              placeholder="Add a description (optional)"
              value={postData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
            <div className="space-y-2 text-left">
              <div className="text-sm font-medium">Tags</div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add a tag"
                  value={currentType}
                  onChange={(e) => setCurrentType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addType()}
                />
                <Button type="button" onClick={addType}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {postData.types.map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="flex flex-row gap-1"
                  >
                    {type}
                    <Button
                      onClick={() => removeType(type)}
                      size="icon"
                      variant="ghost"
                      className="py-0 px-1 w-auto h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                    >
                      x
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Preview
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  width={200}
                  height={200}
                  className="rounded-md object-cover w-full max-w-64 max-h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground">No cover image</span>
                </div>
              )}
            </div>

            <div className="text-lg font-semibold">
              {postData.title || 'Untitled Project'}
            </div>

            {postData.description && (
              <div className="text-sm text-muted-foreground">
                {postData.description}
              </div>
            )}

            {postData.types.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {postData.types.map((type) => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {tracks.filter(t => !t.is_muted).length} track(s) mixed
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="default" 
            className="bg-black text-white hover:bg-black/90 font-source-sans"
            size="sm"
        >
          Publish
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col items-center justify-center gap-16">
        <header className="text-center flex flex-col gap-2">
          <h1 className="text-header font-plex-serif">{currentSetup.header}</h1>
          <h2 className="text-sub-header font-source-sans">
            {currentSetup.subHeader}
          </h2>
        </header>

        <div className="w-full max-w-[320px]">{renderStep()}</div>

        <div className="w-full flex justify-center">
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handlePublish}
              disabled={loading || uploading || !mixedAudioBlob || !postData.title}
            >
              {loading || uploading ? <LoadingSpinner /> : 'Publish Project'}
            </Button>
          ) : (
            <div className="m-auto flex w-full max-w-[320px] justify-between">
              {currentStep > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={mixing}
                >
                  Previous
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleNext}
                disabled={mixing || (currentStep === 0 && mixedAudioBlob !== null)}
                className={currentStep === 0 ? 'm-auto' : ''}
              >
                {mixing ? (
                  <LoadingSpinner />
                ) : currentStep === 0 && !mixedAudioBlob ? (
                  'Mix Tracks'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}