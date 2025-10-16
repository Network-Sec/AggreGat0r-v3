# AggreGat0r-v3
FOSS release of Chuck's favourite LONG RANGE scanner

## You got 2 choices... maybe more, maybe not!
- Chuck uses this tool with mongoDB
- Chuck can install all deps by himself without help from others, or AI
- Chuck knows, .env files are the true DANGER, but knows how to handle them ALL
- Chuck makes an automated reverse DNS lookup list, that must look like this:

```bash
192.168.23.23: sub.domain.example
192.168.23.24: sub2.domain.example
...
```

### Chuck knows, he can tackle LONG RANGE in 2 ways
- Start by making auto-screenshots (see frontend/public/screenshots) on TOP PERCENTER ports
- Start by making pd_scans (see backend/pd_scans) - the noisy bruteforce option

Chuck prefers on LONG RANGES to first make screenshots: They're unobtrusive and result in a good pre-sorting of > 64k targets. 

Chuck makes no mistakes. 

Once he got all screenshots: 
- Chuck uses the result extraction script (we will automate this further in an upcoming version)
- Chuck moves the screenshot image files TO THE ROOT of the screenshots folder
- Chuck passes the result extraction txt file to pd_scans (of course he's got installed those deps and filled all env vars)
- Chuck fires up the pd_scanner - it will add all results to mongoDB

Chuck is now confident and ready to run both frontend and backend. 

# AggreGat0r v3 Demo
We already implemented vast improvements, search / filter, pagination, sorting, better HTTPX results with header and body, lots of layout fixes, VirusTotal and AbuesIPDB fix, ... new screenshots to be uploaded.

