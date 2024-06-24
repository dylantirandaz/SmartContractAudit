import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

const App = () => {
  const [code, setCode] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const analyzeContract = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error analyzing contract:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Smart Contract Auditor</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[200px]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your Solidity contract here..."
          />
          <Button 
            className="mt-4 w-full"
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
      
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vulnerabilities Found</CardTitle>
          </CardHeader>
          <CardContent>
            {results.map((vuln, index) => (
              <Alert key={index} className="mb-4">
                <AlertTitle>{vuln.name}</AlertTitle>
                <AlertDescription>{vuln.description}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default App;
