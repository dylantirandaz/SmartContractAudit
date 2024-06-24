import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, CheckCircle2, Download, Save } from "lucide-react";

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
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [comparisonResults, setComparisonResults] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error('Failed to fetch history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const analyzeContract = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code, language }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setResults(data);
      fetchHistory();
    } catch (error) {
      console.error('Error analyzing contract:', error);
    }
    setLoading(false);
  };

  const saveSnippet = () => {
    if (newSnippetName && code) {
      const newSnippets = [...snippets, { name: newSnippetName, code, language }];
      setSnippets(newSnippets);
      setNewSnippetName('');
    }
  };

  const loadSnippet = (snippet) => {
    setCode(snippet.code);
    setLanguage(snippet.language);
  };

  const exportResults = async (format) => {
    try {
      const response = await fetch(`http://localhost:5000/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(results),
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vulnerabilities.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
    }
    setExportConfirmOpen(false);
  };

  const compareResults = () => {
    if (selectedResults.length < 2) {
      console.error("Please select at least two results to compare.");
      return;
    }

    const allVulnerabilities = new Set();
    selectedResults.forEach(result => {
      result.vulnerabilities.forEach(vuln => {
        allVulnerabilities.add(vuln.name);
      });
    });

    const comparisonResults = Array.from(allVulnerabilities).map(vulnName => {
      return {
        vulnerability: vulnName,
        results: selectedResults.map(result => 
          result.vulnerabilities.some(v => v.name === vulnName)
        )
      };
    });

    setComparisonResults(comparisonResults);
    setCompareDialogOpen(true);
  };

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
                      {results.vulnerabilities.map((vuln, index) => (
                        <Alert key={index} variant="destructive" className="mb-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>{vuln.name}</AlertTitle>
                          <AlertDescription>{vuln.description}</AlertDescription>
                        </Alert>
                      ))}
                      <div className="flex justify-end space-x-2 mt-4">
                        <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setExportFormat('csv')}>
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Export</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to export the results as CSV?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>Cancel</Button>
                              <Button onClick={() => exportResults('csv')}>Confirm Export</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setExportFormat('json')}>
                              <Download className="mr-2 h-4 w-4" />
                              Export JSON
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Export</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to export the results as JSON?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>Cancel</Button>
                              <Button onClick={() => exportResults('json')}>Confirm Export</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
                        item.vulnerabilities.map((vuln, vIndex) => (
                          <Alert key={vIndex} variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{vuln.name}</AlertTitle>
                            <AlertDescription>{vuln.description}</AlertDescription>
                          </Alert>
                        ))
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
                  <Button onClick={compareResults} className="mt-4">
                    Compare Selected Results
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparison Results</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">Vulnerability</th>
                  {selectedResults.map((result, index) => (
                    <th key={index} className="px-4 py-2">Analysis {index + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonResults.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="border px-4 py-2">{row.vulnerability}</td>
                    {row.results.map((result, colIndex) => (
                      <td key={colIndex} className="border px-4 py-2">
                        {result ? '✓' : '✗'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
