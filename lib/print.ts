const print = (htmlContent: string) => {
    const newWindow = window.open('');
    newWindow!.document.write(htmlContent);
    newWindow!.print();
    newWindow!.close();
};

export default print;