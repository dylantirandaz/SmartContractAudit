import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle2, Info, Download, Save, Upload } from "lucide-react";

const vulnerabilityInfo = {
  "Reentrancy": {
    description: "A vulnerability where a contract can be interrupted during execution and re-entered before the first execution is completed.",
    mitigation: "Use the checks-effects-interactions pattern or a reentrancy guard.",
    link: "https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/"
  },
  // Add more vulnerability types here...
};

const App = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('solidity');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [history, setHistory] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [newSnippetName, setNewSnippetName] = useState('');
  const [selectedResults, setSelectedResults] = useState([]);

  useEffect(() => {
    fetchHistory();
    loadSnippets();
  }, []);

  const fetchHistory = async () => {
    // Simulated history fetch
    setHistory([
      { id: 1, created_at: new Date().toISOString(), vulnerabilities: [{ name: "Reentrancy", description: "Potential reentrancy vulnerability detected" }] },
      { id: 2, created_at: new Date(Date.now() - 86400000).toISOString(), vulnerabilities: [] }
    ]);
  };

  const analyzeContract = async () => {
    setLoading(true);
    // Simulated contract analysis
    setTimeout(() => {
      setResults({
        vulnerabilities: [
          { name: "Reentrancy", description: "Potential reentrancy vulnerability detected in function X" }
        ]
      });
      setLoading(false);
    }, 2000);
  };

  const saveSnippet = () => {
    if (newSnippetName && code) {
      const newSnippets = [...snippets, { name: newSnippetName, code, language }];
      setSnippets(newSnippets);
      setNewSnippetName('');
    }
  };

  const loadSnippets = () => {
    // Simulated snippet loading
    setSnippets([
      { name: "Example Contract", code: "contract Example { }", language: "solidity" }
    ]);
  };

  const loadSnippet = (snippet) => {
    setCode(snippet.code);
    setLanguage(snippet.language);
  };

  const exportResults = (format) => {
    // Simulated export functionality
    console.log(`Exporting results in ${format} format`);
    // In a real application, this would generate and download a file
  };

  const renderVulnerability = (vuln, index) => (
    <Alert key={index} variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{vuln.name}</AlertTitle>
      <AlertDescription>{vuln.description}</AlertDescription>
      {vulnerabilityInfo[vuln.name] && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2">More Info</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{vuln.name}</DialogTitle>
              <DialogDescription>
                {vulnerabilityInfo[vuln.name].description}
                <h4 className="font-bold mt-2">Mitigation:</h4>
                <p>{vulnerabilityInfo[vuln.name].mitigation}</p>
                <a href={vulnerabilityInfo[vuln.name].link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-2 inline-block">
                  Learn More
                </a>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </Alert>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white p-4 border-r">
        <h1 className="text-2xl font-bold mb-6">Smart Contract Auditor</h1>
        <nav>
          {['editor', 'results', 'history'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              className="w-full justify-start mb-2 capitalize"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </nav>
      </div>
      <main className="flex-1 p-6 overflow-y-auto">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Contract Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solidity">Solidity</SelectItem>
                    <SelectItem value="vyper">Vyper</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  className="min-h-[300px] mb-4 font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`Paste your ${language} contract here...`}
                />
                <div className="flex justify-between mb-4">
                  <Input
                    placeholder="Snippet name"
                    value={newSnippetName}
                    onChange={(e) => setNewSnippetName(e.target.value)}
                    className="w-2/3 mr-2"
                  />
                  <Button onClick={saveSnippet} className="w-1/3">
                    <Save className="mr-2 h-4 w-4" />
                    Save Snippet
                  </Button>
                </div>
                <Select onValueChange={(snippet) => loadSnippet(JSON.parse(snippet))}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Load Snippet" />
                  </SelectTrigger>
                  <SelectContent>
                    {snippets.map((snippet, index) => (
                      <SelectItem key={index} value={JSON.stringify(snippet)}>
                        {snippet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full"
                  onClick={analyzeContract}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Contract'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="results">
            {results && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.vulnerabilities.length > 0 ? (
                    <>
                      {results.vulnerabilities.map((vuln, index) => renderVulnerability(vuln, index))}
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button onClick={() => exportResults('csv')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export CSV
                        </Button>
                        <Button onClick={() => exportResults('pdf')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export PDF
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Alert variant="default">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>No Vulnerabilities Detected</AlertTitle>
                      <AlertDescription>The analysis did not find any vulnerabilities in the contract.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.map((item, index) => (
                  <Card key={index} className="mb-4">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>Analysis from {new Date(item.created_at).toLocaleString()}</span>
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResults([...selectedResults, item]);
                            } else {
                              setSelectedResults(selectedResults.filter(r => r.id !== item.id));
                            }
                          }}
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {item.vulnerabilities.length > 0 ? (
                        item.vulnerabilities.map((vuln, vIndex) => renderVulnerability(vuln, vIndex))
                      ) : (
                        <Alert variant="default">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>No Vulnerabilities Detected</AlertTitle>
                          <AlertDescription>This analysis did not find any vulnerabilities.</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {selectedResults.length > 1 && (
                  <Button onClick={() => {
                    // Implement comparison logic here
                    console.log("Comparing:", selectedResults);
                  }}>
                    Compare Selected Results
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default App;
