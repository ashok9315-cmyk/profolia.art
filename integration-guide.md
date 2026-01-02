# Profolia.art Integration Guide

## 🎯 Production API Configuration

Your deployed API is ready at:
**Base URL**: `https://et0ybn33zg.execute-api.us-east-1.amazonaws.com/prod`

### API Endpoints Available:
- `POST /api/upload-resume` - Upload resume files
- `GET /api/processing-status/{jobId}` - Check processing status
- `GET /api/portfolio-content/{jobId}` - Get generated portfolio
- `POST /api/save-preferences` - Save user preferences
- `POST /api/load-preferences` - Load user preferences
- `DELETE /api/delete-data` - Delete user data

## 🔧 Frontend Integration

### 1. Add JavaScript Files to Your Website

Copy these files to your profolia.art website:

```
profolia.art/
├── js/
│   ├── apiClient.js          # API communication
│   ├── resumeUploader.js     # File upload component
│   └── contentRenderer.js    # Portfolio display
└── css/
    ├── resumeUploader.css    # Upload styling
    └── contentRenderer.css   # Portfolio styling
```

### 2. Update Your HTML

Add this to your existing profolia.art HTML:

```html
<!-- In your <head> section -->
<link rel="stylesheet" href="css/resumeUploader.css">
<link rel="stylesheet" href="css/contentRenderer.css">

<!-- Add upload section to your page -->
<section id="upload" class="section">
    <div class="container">
        <h2>Upload Your Resume</h2>
        <div id="resumeUploaderContainer"></div>
    </div>
</section>

<!-- Add portfolio display section -->
<section id="portfolio" class="section" style="display: none;">
    <div class="container">
        <h2>Your AI-Enhanced Portfolio</h2>
        <div id="portfolioContent"></div>
    </div>
</section>

<!-- Before closing </body> tag -->
<script src="js/apiClient.js"></script>
<script src="js/resumeUploader.js"></script>
<script src="js/contentRenderer.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with your production API
    const apiBaseUrl = 'https://et0ybn33zg.execute-api.us-east-1.amazonaws.com/prod';
    
    const apiClient = new ApiClient(apiBaseUrl, {
        timeout: 30000,
        retryAttempts: 3
    });
    
    const uploader = new ResumeUploader('resumeUploaderContainer', {
        apiBaseUrl: apiBaseUrl,
        apiClient: apiClient
    });
    
    let renderer = null;
    
    document.addEventListener('portfolioReady', function(event) {
        const jobId = event.detail.jobId;
        
        if (!renderer) {
            renderer = new ContentRenderer('portfolioContent', {
                apiBaseUrl: apiBaseUrl,
                apiClient: apiClient,
                enablePreview: true,
                autoSave: true
            });
        }
        
        renderer.loadPortfolio(jobId).then(() => {
            document.getElementById('portfolio').style.display = 'block';
            document.getElementById('portfolio').scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
</script>
```

## 🎨 Styling Integration

The CSS files are designed to integrate seamlessly with your existing profolia.art design. Key features:

### Resume Uploader
- Drag & drop interface
- Progress indicators
- Error handling
- Mobile responsive

### Content Renderer
- Toggle between original/AI-enhanced content
- Preview mode for comparison
- Real-time content updates
- Professional portfolio layout

## 🔒 Security Features

Your deployment includes:
- ✅ HTTPS enforcement
- ✅ File type validation (PDF/DOCX only)
- ✅ File size limits (5MB max)
- ✅ Rate limiting
- ✅ Data encryption
- ✅ Automatic data cleanup

## 📱 User Experience Flow

1. **Upload**: User drags/drops resume file
2. **Processing**: Real-time progress updates
3. **Enhancement**: AI processes and enhances content
4. **Display**: Portfolio renders with toggle controls
5. **Customization**: User can switch between original/enhanced views
6. **Persistence**: Preferences saved automatically

## 🚀 Go Live Checklist

- [ ] Copy JavaScript files to your website
- [ ] Copy CSS files to your website  
- [ ] Update HTML with new sections
- [ ] Test file upload functionality
- [ ] Test portfolio generation
- [ ] Verify mobile responsiveness
- [ ] Test error handling scenarios

## 🔧 Advanced Configuration

### Custom Styling
You can customize the appearance by modifying the CSS variables:

```css
:root {
    --primary-color: #007bff;
    --success-color: #28a745;
    --error-color: #dc3545;
    --text-color: #2c3e50;
    --border-radius: 8px;
}
```

### Analytics Integration
Add tracking to monitor usage:

```javascript
document.addEventListener('portfolioUpdated', function(event) {
    // Google Analytics example
    if (window.gtag) {
        gtag('event', 'portfolio_view_changed', {
            'view_type': event.detail.view,
            'preview_mode': event.detail.previewMode
        });
    }
});
```

## 🆘 Troubleshooting

### Common Issues:

1. **CORS Errors**: Your API is configured for profolia.art domain
2. **File Upload Fails**: Check file size (5MB max) and type (PDF/DOCX)
3. **Processing Timeout**: Large files may take longer to process
4. **Styling Issues**: Ensure CSS files are loaded correctly

### Support:
- Check browser console for error messages
- Verify API endpoint is accessible
- Test with different file types and sizes

## 📊 Monitoring

Your deployment includes monitoring for:
- API response times
- Error rates
- File processing success rates
- User engagement metrics

## 🎉 You're Ready!

Your Resume Portfolio Generator is production-ready and integrated with:
- Serverless AWS infrastructure
- AI-powered content enhancement
- Real-time processing updates
- Mobile-responsive design
- Comprehensive error handling

The system will automatically handle user uploads, process resumes, enhance content with AI, and display beautiful portfolios - all while maintaining your existing profolia.art branding and user experience.