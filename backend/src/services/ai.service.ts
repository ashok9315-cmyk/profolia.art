import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface ProfileData {
  name: string;
  professionType: string;
  email?: string;
  phone?: string;
  githubUrl?: string;
  websiteUrl?: string;
  bio?: string;
  skills?: string[];
  customFields?: Record<string, any>;
  mediaAssets?: Array<{
    fileUrl: string;
    fileType: string;
    category?: string;
    tags?: string[];
  }>;
}

/**
 * Generate username suggestions based on user's name
 */
export async function generateUsernameSuggestions(name: string): Promise<string[]> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Generate 10 unique, professional username suggestions for a person named "${name}". 
      Requirements:
      - Lowercase only
      - No spaces or special characters except hyphens and underscores
      - Between 4-20 characters
      - Professional and memorable
      - Mix of different styles (firstname, firstnamelastname, creative variations)
      
      Return ONLY a JSON array of strings, nothing else.
      Example: ["johnsmith", "john-smith", "jsmith", "john_s", "smithjohn"]`
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    }
    
    return [];
  } catch (error) {
    console.error('Error generating usernames:', error);
    throw error;
  }
}

/**
 * Analyze media files and categorize them by profession
 */
export async function analyzeMedia(
  fileData: { fileName: string; fileType: string; description?: string }[],
  professionType: string
): Promise<Array<{ fileName: string; category: string; tags: string[]; description: string }>> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze these media files for a ${professionType}'s portfolio and categorize them:
      
Files: ${JSON.stringify(fileData, null, 2)}

Based on the profession type and file names/types, categorize each file and suggest:
1. A category (e.g., "Featured Work", "Projects", "Gallery", "About", etc.)
2. Relevant tags
3. A brief description of what this might be

Return a JSON array with this structure:
[
  {
    "fileName": "example.jpg",
    "category": "Featured Work",
    "tags": ["tag1", "tag2"],
    "description": "Brief description"
  }
]

Return ONLY valid JSON, nothing else.`
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    }
    
    return [];
  } catch (error) {
    console.error('Error analyzing media:', error);
    throw error;
  }
}

/**
 * Generate portfolio HTML based on profile data
 */
export async function generatePortfolioHTML(profileData: ProfileData): Promise<string> {
  try {
    const prompt = `Create a stunning, modern, single-page portfolio website HTML for ${profileData.name}, a ${profileData.professionType}.

Profile Information:
- Email: ${profileData.email || 'Not provided'}
- Phone: ${profileData.phone || 'Not provided'}
- GitHub: ${profileData.githubUrl || 'Not provided'}
- Website: ${profileData.websiteUrl || 'Not provided'}
- Bio: ${profileData.bio || 'Not provided'}
- Skills: ${profileData.skills?.join(', ') || 'Not provided'}

Create a beautiful, responsive HTML5 portfolio website with:
1. Modern design with gradient backgrounds
2. Professional color scheme
3. Smooth animations and transitions
4. Mobile responsive layout
5. Sections for: Hero, About, Skills, Projects/Work, Contact
6. Embedded contact form
7. Social media links
8. Dark theme with cyan, purple, and amber accents

Return ONLY the complete HTML code, no explanations or markdown.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    
    return '';
  } catch (error) {
    console.error('Error generating portfolio HTML:', error);
    throw error;
  }
}

/**
 * Generate optimized bio/description for a profession
 */
export async function generateBio(
  name: string,
  professionType: string,
  existingBio?: string
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Write a professional, engaging bio for ${name}, a ${professionType}.
${existingBio ? `Current bio: ${existingBio}` : ''}

Requirements:
- 150-250 words
- Highlight expertise and unique value
- Professional yet personable tone
- Include call-to-action

Return ONLY the bio text, nothing else.`
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    
    return '';
  } catch (error) {
    console.error('Error generating bio:', error);
    throw error;
  }
}

/**
 * Get profession-specific form fields
 */
export async function getProfessionFields(professionType: string): Promise<Record<string, any>> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `For a portfolio platform, suggest relevant custom fields to collect from a ${professionType}. 

Return a JSON object where keys are field names and values are field types (text, number, textarea, select, etc.).

For example:
{
  "hourlyRate": "number",
  "servicesOffered": "textarea",
  "yearsExperience": "number"
}

Return ONLY valid JSON, nothing else.`
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedText);
    }
    
    return {};
  } catch (error) {
    console.error('Error getting profession fields:', error);
    throw error;
  }
}
